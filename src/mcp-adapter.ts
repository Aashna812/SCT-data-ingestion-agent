// NOTE: ALL code changes in this file MUST be reflected in the documentation portal.

import { MultiServerMCPClient } from '@langchain/mcp-adapters';

/**
 * Client to connect to multiple MCP servers.
 */
export const mcpClient = new MultiServerMCPClient({
  throwOnLoadError: true,
  prefixToolNameWithServerName: false,
  additionalToolNamePrefix: '',
  useStandardContentBlocks: true,
  mcpServers: {
    'sct-mcp-server': {
      url: 'http://localhost:8888/sse',
      transport: 'sse'
    }
  }
});

export const getMCPTools = async () => {
  const tools =  await mcpClient.getTools();
  return tools;
}
