import { StateAnnotation } from "../retrieval_graph/state.js"
import { VertexAIEmbeddings } from "@langchain/google-vertexai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { getMessageText } from "../utils/getMessageText.js"

export async function vectorSearch(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    // Use the parsed query if available, otherwise fall back to the original message
    const query = state.parsedQuery || getMessageText(state.messages[state.messages.length - 1])

    const embeddingModel = new VertexAIEmbeddings({ model: "text-embedding-005" })

    const indexName = process.env.PINECONE_INDEX_NAME
    if (!indexName) {
        throw new Error("PINECONE_INDEX_NAME environment variable is not defined")
    }

    const pinecone = new Pinecone()
    const pineconeIndex = pinecone.Index(indexName)
    const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
        pineconeIndex
    })

    // Use similaritySearchWithScore to get both documents and their similarity scores
    const resultsWithScores = await vectorStore.similaritySearchWithScore(query, 10)

    // Add the score to each document's metadata
    const docsWithScores = resultsWithScores.map(([doc, score]) => {
        return {
            ...doc,
            metadata: {
                ...doc.metadata,
                score: score
            }
        }
    })

    return { retrievedDocs: docsWithScores }
}
