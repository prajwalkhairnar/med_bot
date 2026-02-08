import { ChatVertexAI } from "@langchain/google-vertexai"
import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"
import { getMessageText } from "../utils/getMessageText.js"

/**
 * Response Generator Node
 * 
 * Takes the research summary and the user's original question to generate
 * a comprehensive, natural language response.
 * 
 * This is the final step that synthesizes the research into a helpful answer.
 */

const RESPONSE_GENERATION_PROMPT = `<task>
You are a medical research assistant. Your job is to answer the user's question using the provided research summary.
</task>

<instructions>
1. Answer the user's question directly and comprehensively
2. Use the research summary as your primary source of information
3. Cite specific findings and mention publication dates when relevant
4. If there are contradictions in the research, acknowledge them
5. Highlight recent findings vs older research when applicable
6. Be clear, accurate, and helpful
7. Use medical terminology appropriately but remain accessible
8. If the research doesn't fully answer the question, acknowledge limitations
9. Do NOT make up information - only use what's in the research summary
</instructions>

<user_question>
{question}
</user_question>

<research_summary>
{summary}
</research_summary>

<output_format>
Provide a clear, well-structured answer that:
- Directly addresses the user's question
- References specific research findings with PMIDs and dates
- Uses bullet points or short paragraphs for readability
- Acknowledges any limitations or contradictions
- Is written in natural, conversational language
- Stays CONCISE and focused - avoid lengthy paragraphs
</output_format>

<response>
`

export async function responseGenerator(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const userQuery = getMessageText(state.messages[state.messages.length - 1])
    const { researchSummary } = state

    // If no summary available, return error message
    if (!researchSummary || researchSummary.length === 0) {
        console.log("[Response Generator] No research summary available")
        const errorMessage = new AIMessage("I apologize, but I couldn't generate a response based on the available research. Please try rephrasing your question.")
        return { messages: [errorMessage] }
    }

    console.log(`[Response Generator] Generating response for: "${userQuery}"`)
    console.log(`[Response Generator] Using summary of ${researchSummary.length} characters`)

    // Initialize Gemini model for response generation
    const model = new ChatVertexAI({
        model: "gemini-2.0-flash-001",
        temperature: 0.4, // Slightly creative for natural language
        maxOutputTokens: 800 // Concise, focused responses
    })

    try {
        const prompt = RESPONSE_GENERATION_PROMPT
            .replace("{question}", userQuery)
            .replace("{summary}", researchSummary)

        const response = await model.invoke(prompt)
        const generatedResponse = response.content.toString().trim()

        console.log(`[Response Generator] Generated response (${generatedResponse.length} characters)`)
        console.log(`[Response Generator] Response preview: ${generatedResponse.substring(0, 200)}...`)

        const aiMessage = new AIMessage(generatedResponse)
        return { messages: [aiMessage] }
    } catch (error) {
        console.error("[Response Generator] Error during response generation:", error)

        // Fallback to basic response if LLM fails
        const fallbackMessage = new AIMessage(
            `Based on the research I found:\n\n${researchSummary.substring(0, 500)}...\n\n(Note: Full response generation encountered an error)`
        )
        return { messages: [fallbackMessage] }
    }
}
