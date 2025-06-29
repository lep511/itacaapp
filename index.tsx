/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { GoogleGenAI, mcpToTool } from '@google/genai';
import { ChatState, marked, Playground } from './playground';

import { startMcpGoogleMapServer } from './mcp_maps_server';

/* --------- */


async function startClient(transport: Transport) {
  const client = new Client({ name: "AI Studio", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/* ------------ */


const SYSTEM_INSTRUCTIONS = `you're an extremely proficient with map and discovering interesting places.
You can use tools to control the map or find information about places like restaurants.
When asked a question try to use tools to show related informations on the map or provide information from available data sources.
Always explain what are you doing.`;

const EXAMPLE_PROMPTS = [
  'Where is something cool to see',
  'Show me San Francisco',
  'Where is a place with a tilted tower?',
  'Show me Mount Everest',
  'Can you show me Mauna Kea in Hawaii?',
  "Let's go to Venice, Italy.",
  'Take me to the northernmost capital city in the world',
  'Show me the location of the ancient city of Petra in Jordan',
  "Let's jump to Machu Picchu in Peru",
  "Can you show me the Three Gorges Dam in China?",
  "Can you find a town or city with a really funny or unusual name and show it to me?",
  "Find a good pizza place near the Eiffel Tower",
  "Are there any highly-rated seafood restaurants in Boston?",
  "Take me to the Great Wall of China",
  "Can we visit the pyramids of Giza?",
  "Show me a pink sand beach",
  "Find a street with rainbow-colored houses",
  "Where's the best place to see the Northern Lights?",
  "Take me to a volcano that's still active",
  "Show me the capital city of Bhutan",
  "What's the deepest canyon in the world and where is it?",
  "Find a floating market in Southeast Asia",
  "Take me to the most colorful coral reef",
  "Where can I find a desert with giant sand dunes?",
  "Can we visit a castle in Scotland?",
  "Take me to a place with the clearest water on Earth",
  "Where's the largest tree in the world?",
  "Find a cliffside village in the Mediterranean"
];

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

function createAiChat(mcpClient: Client) {
  return ai.chats.create({
    model: 'gemini-2.5-flash-preview-04-17',
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS,
      tools: [mcpToTool(mcpClient)],
    },
  });
}

function camelCaseToDash(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

document.addEventListener('DOMContentLoaded', async (event) => {
  const rootElement = document.querySelector('#root')! as HTMLElement;

  const playground = document.createElement('gdm-playground') as Playground;
  rootElement.appendChild(playground);

  playground.renderMapQuery({ location: 'London' });


  // ---------

  const [transportA, transportB] = InMemoryTransport.createLinkedPair();

  void startMcpGoogleMapServer(transportA, (params: { location?: string, origin?: string, destination?: string, search?: string }) => {
    playground.renderMapQuery(params);
  });

  const mcpClient = await startClient(transportB);

  // --------

  const aiChat = createAiChat(mcpClient);

  playground.sendMessageHandler = async (
    input: string,
    role: string,
  ) => {
    console.log(
      'sendMessageHandler',
      input,
      role
    );

    const { thinking, text } = playground.addMessage('assistant', '');
    const message = [];

    message.push({
      role,
      text: input,
    });

    playground.setChatState(ChatState.GENERATING);

    text.innerHTML = '...';

    let newCode = '';
    let thought = '';


    try {
      const res = await aiChat.sendMessageStream({ message });

      for await (const chunk of res) {
        for (const candidate of chunk.candidates ?? []) {
          for (const part of candidate.content?.parts ?? []) {
            if (part.functionCall) {
              console.log('FUNCTION CALL:', part.functionCall.name, part.functionCall.args);
              const mcpCall = {
                name: camelCaseToDash(part.functionCall.name!),
                arguments: part.functionCall.args
              };
              // ==================================
              // Show the function call in the chat
              // ================================== 
              const explanation = 'Calling function:\n```json\n' + JSON.stringify(mcpCall, null, 2) + '\n```'
              const { thinking, text } = playground.addMessage('assistant', '');
              text.innerHTML = await marked.parse(explanation);
            }

            if (part.thought) {
              playground.setChatState(ChatState.THINKING);
              if (part.text) {
                thought += part.text;
                thinking.innerHTML = await marked.parse(thought);
                thinking.parentElement!.classList.remove('hidden');
              }
            } else if (part.text) {
              playground.setChatState(ChatState.EXECUTING);
              newCode += part.text;
              text.innerHTML = await marked.parse(newCode);
            }
            playground.scrollToTheEnd();
          }
        }
      }
    } catch (e: any) {
      console.error('GenAI SDK Error:', e.message);
      let message = e.message;
      const splitPos = e.message.indexOf('{');
      if (splitPos > -1) {
        const msgJson = e.message.substring(splitPos);
        try {
          const sdkError = JSON.parse(msgJson);
          if (sdkError.error) {
            message = sdkError.error.message;
            message = await marked.parse(message);
          }
        } catch (e) {
          console.error('Unable to parse the error message:', e);
        }
      }
      const { text } = playground.addMessage('error', '');
      text.innerHTML = message;
    }

    // close thinking block
    thinking.parentElement!.removeAttribute('open');

    // If the answer was just code
    if (text.innerHTML.trim().length === 0) {
      text.innerHTML = 'Done';
    }

    playground.setChatState(ChatState.IDLE);
  };

  playground.setInputField(
    EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)],
  );
});