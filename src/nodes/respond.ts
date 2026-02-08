import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"

export async function respond(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const response = new AIMessage(JSON.stringify(state.retrievedDocs, null, 4))
    return { messages: [response] }
}
