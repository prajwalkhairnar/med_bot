import { ChatVertexAI } from "@langchain/google-vertexai"
import { StateAnnotation } from "../retrieval_graph/state.js"

/**
 * Research Summarizer Node
 * 
 * Takes the enriched research papers (with abstracts and publication dates)
 * and creates a comprehensive summary that preserves all important information
 * while organizing it chronologically.
 * 
 * This summary will be used by the response generator to create the final answer.
 */

const SUMMARIZATION_PROMPT = `<task>
You are a medical research summarizer. Your job is to create a CONCISE summary of research papers organized chronologically.
</task>

<instructions>
1. Review all the provided research papers with their abstracts and publication dates
2. Organize the information chronologically, noting the evolution of research over time
3. Focus on KEY findings and conclusions - be selective and concise
4. Highlight any contradictions or evolving understanding across different time periods
5. Note the recency of findings (recent papers may have more up-to-date information)
6. Keep the summary FOCUSED and CONCISE - capture essential information only
7. Use clear medical terminology but remain accessible
8. Avoid excessive detail - prioritize the most important findings
</instructions>

<research_papers>
{papers}
</research_papers>

<output_format>
Provide a detailed chronological summary that includes:
- Key findings from each paper
- Publication dates and temporal context
- Evolution of understanding over time
- Important methodologies or study designs
- Any contradictions or consensus in the literature
</output_format>

<summary>
`

export async function researchSummarizer(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const { retrievedDocs } = state

    // If no documents, skip summarization
    if (!retrievedDocs || retrievedDocs.length === 0) {
        console.log("[Research Summarizer] No documents to summarize")
        return { researchSummary: "" }
    }

    // Format papers with abstracts and dates
    const formattedPapers = retrievedDocs.map((doc, index) => {
        const metadata = doc.metadata || {}
        const title = metadata.title || "Untitled"
        const abstract = metadata.pubmed_abstract || metadata.text || "No abstract available"
        const date = metadata.pubmed_date || "Date unknown"
        const pmid = metadata.pmid || "Unknown"

        return `
Paper ${index + 1}:
Title: ${title}
PMID: ${pmid}
Publication Date: ${date}
Abstract: ${abstract}
---`
    }).join("\n\n")

    console.log(`[Research Summarizer] Summarizing ${retrievedDocs.length} papers...`)

    // Initialize Gemini model for summarization
    const model = new ChatVertexAI({
        model: "gemini-2.0-flash-001",
        temperature: 0.3, // Slightly creative but focused on accuracy
        maxOutputTokens: 1024 // Concise summaries - focus on key findings
    })

    try {
        const prompt = SUMMARIZATION_PROMPT.replace("{papers}", formattedPapers)
        const response = await model.invoke(prompt)

        const summary = response.content.toString().trim()

        console.log(`[Research Summarizer] Generated summary (${summary.length} characters)`)
        console.log(`[Research Summarizer] Summary preview: ${summary.substring(0, 200)}...`)

        return { researchSummary: summary }
    } catch (error) {
        console.error("[Research Summarizer] Error during summarization:", error)
        // Fallback to basic concatenation if LLM fails
        const fallbackSummary = retrievedDocs.map((doc, i) => {
            const metadata = doc.metadata || {}
            return `${i + 1}. ${metadata.title || "Untitled"} (${metadata.pubmed_date || "Date unknown"}): ${metadata.pubmed_abstract || metadata.text || "No abstract"}`
        }).join("\n\n")

        return { researchSummary: fallbackSummary }
    }
}
