import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getMCPTools } from "./mcp-adapter.js";
import { OrchestrationClient } from "@sap-ai-sdk/langchain";
import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  START,
  END,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const DEFAULT_RESOURCE_GROUP = "default";

export const startAgent = async () => {
  const tools = await getMCPTools();
  const config = {
    promptTemplating: {
      model: {
        name: "gpt-4.1",
        params: {
          temperature: 0.7,
        },
      },
    },
  };
  // Create a model
  const model = new OrchestrationClient(
    config,
    {},
    { resourceGroup: DEFAULT_RESOURCE_GROUP }
  );

  // create a model with access to the tools
  const modelWithTools = model.bindTools(tools);

  const toolNode = new ToolNode(tools);
  const callModel = async ({ messages }) => {
    const response = await modelWithTools.invoke(messages);
    return { messages: [response] };
  };

  const shouldContinueAgent = async ({
    messages,
  }: typeof MessagesAnnotation.State) => {
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If there are tool calls, go to tools
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return END;
  };
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addConditionalEdges("agent", shouldContinueAgent, ["tools", END])
    .addEdge("tools", "agent")
    .addEdge(START, "agent");

  const memory = new MemorySaver();
  const app = workflow.compile({ checkpointer: memory });
  const conf = { configurable: { thread_id: "conv-1" } };
  // Initial system prompt and user message
  const initMessages = [
    new SystemMessage(
      ` Since companies need to report on their sustainability practices and provide data, you will assist them in gathering the data and also analysing and mapping it.
       For any sustainability standard, we need to have the standard, standard version, disclosure requirements and metrics maintained in the system.
       You are given a new sustainability standard, and you need to perform follwing tasks.
       1. Create a Reporting Standard with ID and name.
       2. Create the reporting standard version.
       3. Gather disclosure requirements and metrics for the standard.`
    ),
    new HumanMessage("BRSR - Business Responsibility and Sustainability Reporting"),
  ];

  // Start the agent with initial messages
  try {
    let response = await app.invoke({ messages: initMessages }, conf);

    console.log(
      "Assistant:",
      response.messages[response.messages.length - 1]?.content
    );
  } catch (error) {
    console.error("Error:", error);
  }
};
