import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"

const OUT_OF_SCOPE_RESPONSE = `I'm a medical research chatbot designed to help answer questions about medicine, healthcare, and medical research.

Your question appears to be outside my area of expertise. I can help you with:

- Medical conditions, diseases, and symptoms
- Treatments, medications, and procedures
- Medical research and clinical studies
- Health-related topics and public health
- Anatomy, physiology, and pathology

Please ask a medical or health-related question, and I'll do my best to find relevant information from medical research papers.`

export async function outOfScopeResponse(_state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const response = new AIMessage(OUT_OF_SCOPE_RESPONSE)

    return { messages: [response] }
}
