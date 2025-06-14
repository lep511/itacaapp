/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {z} from 'zod';

export interface MapParams {
  location?: string;
  search?: string;
  origin?: string;
  destination?: string;
}

export async function startMcpGoogleMapServer(
  transport: Transport,
  mapQueryHandler: (params: MapParams) => void,
) {
  // Create an MCP server
  const server = new McpServer({
    name: 'AI Studio Google Map',
    version: '1.0.0',
  });

  server.tool(
    'view_location_google_maps',
    'View a specific query or geographical location and display in the embedded maps interface',
    {query: z.string()},
    async ({query}) => {
      mapQueryHandler({location: query});
      return {
        content: [{type: 'text', text: `Navigating to: ${query}`}],
      };
    },
  );

  server.tool(
    'search_google_maps',
    'Search google maps for a series of places near a location and display it in the maps interface',
    {search: z.string()},
    async ({search}) => {
      mapQueryHandler({search});
      return {
        content: [{type: 'text', text: `Searching: ${search}`}],
      };
    },
  );

  server.tool(
    'view_location_on_google_maps',
    'View a specific query or geographical location and display in the embedded maps interface',
    {location: z.string()},
    async ({location}) => {
      mapQueryHandler({location});
      return {
        content: [{type: 'text', text: `Viewing location: ${location}`}],
      };
    },
  );

  server.tool(
    'directions_on_google_maps',
    'Search google maps for directions from origin to destination.',
    {origin: z.string(), destination: z.string()},
    async ({origin, destination}) => {
      mapQueryHandler({origin, destination});
      return {
        content: [
          {type: 'text', text: `Navigating from ${origin} to ${destination}`},
        ],
      };
    },
  );


  // Tool to search for restaurants in a sample MongoDB database
  // Note: This is a placeholder. Actual MongoDB integration should be done on the backend.

  server.tool(
    'search_restaurants',
    'Searches the sample_restaurants database for restaurants based on a query. Can be used to find types of food, specific restaurant names, or restaurants in an area.',
    {
      searchQuery: z.string().describe('The search term for restaurants, e.g., "pizza", "sushi", "Restaurant Name".'),
      locationContext: z.string().optional().describe('Optional location context for the search, e.g., "near Eiffel Tower", "in San Francisco".'),
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ({ searchQuery, locationContext }) => {
      //
      // IMPORTANT: This is a placeholder.
      // In a real application, this function would make a call to a secure backend API.
      // That backend API would then query the MongoDB 'sample_restaurants' database.
      // The MongoDB connection string and credentials must be handled securely on the backend,
      // never exposed in client-side code.
      //
      let message = `Attempting to search for restaurants with query: "${searchQuery}"`;
      if (locationContext) {
        message += ` near "${locationContext}"`;
      }
      message +=
        '. (Note: This is a placeholder. Backend MongoDB integration is required for actual search results.)';
      
      return {
        content: [{ type: 'text', text: message }],
      };
    }
  );

  await server.connect(transport);
  console.log('server running');
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}