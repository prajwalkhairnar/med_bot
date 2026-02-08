import { ChatVertexAI } from "@langchain/google-vertexai"
import { StateAnnotation } from "../retrieval_graph/state.js"
import { getMessageText } from "../utils/getMessageText.js"

/**
 * Query Parser Node
 * 
 * Optimizes user queries for better vector search results.
 * Transforms natural language questions into search-optimized queries by:
 * - Extracting key medical terms and concepts
 * - Removing conversational filler words
 * - Expanding abbreviations and acronyms
 * - Adding relevant medical terminology
 * - Maintaining the core intent of the query
 * 
 * This improves retrieval relevance by creating queries that better match
 * the academic/technical language used in PubMed research papers.
 */

const QUERY_PARSING_PROMPT = `<task>
You are a medical query optimizer. Your job is to transform natural language questions into optimized search queries for a medical research database (PubMed).
</task>

<instructions>
1. Extract the core medical concepts and terms from the user's question
2. Remove conversational filler words (e.g., "I want to know", "Can you tell me", "please")
3. Expand common medical abbreviations if they appear
4. Use precise medical terminology when appropriate
5. Keep the query concise but comprehensive (typically 3-10 words)
6. Maintain the original intent and scope of the question
7. Return ONLY the optimized query - no explanations or additional text
</instructions>

<examples>
User: "What are the symptoms of diabetes?"
Optimized: "diabetes symptoms clinical manifestations"

User: "Can you tell me about treatments for high blood pressure?"
Optimized: "hypertension treatment management therapeutic interventions"

User: "I'm curious about the side effects of aspirin"
Optimized: "aspirin adverse effects side effects complications"

User: "How does COVID-19 affect the lungs?"
Optimized: "COVID-19 pulmonary effects lung pathology respiratory complications"

User: "What causes Alzheimer's disease?"
Optimized: "Alzheimer's disease etiology pathogenesis causes"
</examples>

<user_question>
{query}
</user_question>

<output>
Optimized Query:`

export async function queryParser(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const userQuery = getMessageText(state.messages[state.messages.length - 1])

    // Initialize Gemini model for query optimization
    const model = new ChatVertexAI({
        model: "gemini-2.0-flash-001",
        temperature: 0.3, // Slightly creative but still focused
        maxOutputTokens: 50 // Optimized queries should be concise
    })

    try {
        const prompt = QUERY_PARSING_PROMPT.replace("{query}", userQuery)
        const response = await model.invoke(prompt)

        // Extract and clean the optimized query
        let parsedQuery = response.content.toString().trim()

        // Remove any potential prefix like "Optimized Query:" if the model includes it
        parsedQuery = parsedQuery.replace(/^(optimized query:|query:)/i, "").trim()

        // Remove quotes if the model wrapped the query in them
        parsedQuery = parsedQuery.replace(/^["']|["']$/g, "")

        console.log(`[Query Parser] Original Query: "${userQuery}"`)
        console.log(`[Query Parser] Parsed Query: "${parsedQuery}"`)

        return { parsedQuery }
    } catch (error) {
        console.error("[Query Parser] Error during query parsing:", error)
        console.log("[Query Parser] Falling back to original query")

        // Fallback: use the original query if parsing fails
        return { parsedQuery: userQuery }
    }
}
