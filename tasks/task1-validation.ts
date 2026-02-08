import { VertexAIEmbeddings } from "@langchain/google-vertexai"
import { Pinecone } from "@pinecone-database/pinecone"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

dotenv.config()

interface TestResult {
    timestamp: string
    input: string
    success: boolean
    steps: Array<{
        step: string
        status: string
        details?: string
    }>
    output?: {
        resultsCount: number
        sampleResults: Array<{
            score: number
            title?: string
            authors?: string
            journal?: string
            pmcLink?: string
        }>
    }
    rawOutput?: any
    error?: string
}

async function runTask1Validation() {
    const result: TestResult = {
        timestamp: new Date().toISOString(),
        input: "diabetes treatment",
        success: false,
        steps: []
    }

    try {
        // Step 1: Initialize Vertex AI
        result.steps.push({
            step: "Initialize Google Vertex AI Embeddings",
            status: "RUNNING"
        })

        const embeddingModel = new VertexAIEmbeddings({
            model: "text-embedding-005"
        })

        result.steps[result.steps.length - 1].status = "SUCCESS"
        result.steps[result.steps.length - 1].details = "Model: text-embedding-005"

        // Step 2: Generate embedding
        result.steps.push({
            step: "Generate Embedding Vector",
            status: "RUNNING"
        })

        const embedding = await embeddingModel.embedQuery(result.input)

        result.steps[result.steps.length - 1].status = "SUCCESS"
        result.steps[result.steps.length - 1].details = `Vector dimensions: ${embedding.length}`

        // Step 3: Connect to Pinecone
        result.steps.push({
            step: "Connect to Pinecone Vector Database",
            status: "RUNNING"
        })

        const pinecone = new Pinecone()
        const index = pinecone.Index("pubmed-articles")

        result.steps[result.steps.length - 1].status = "SUCCESS"
        result.steps[result.steps.length - 1].details = "Index: pubmed-articles"

        // Step 4: Query Pinecone
        result.steps.push({
            step: "Query Vector Database",
            status: "RUNNING"
        })

        const queryResponse = await index.query({
            vector: embedding,
            topK: 5,
            includeMetadata: true
        })

        result.steps[result.steps.length - 1].status = "SUCCESS"
        result.steps[result.steps.length - 1].details = `Retrieved ${queryResponse.matches?.length || 0} results`

        // Step 5: Process results
        result.output = {
            resultsCount: queryResponse.matches?.length || 0,
            sampleResults: queryResponse.matches?.slice(0, 3).map(match => ({
                score: match.score || 0,
                title: match.metadata?.title as string,
                authors: match.metadata?.authors as string,
                journal: match.metadata?.journal as string,
                pmcLink: match.metadata?.pmc_link as string
            })) || []
        }

        // Store raw output
        result.rawOutput = queryResponse.matches?.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
        }))

        result.success = true

    } catch (error: any) {
        result.success = false
        result.error = error.message

        // Mark last step as failed
        if (result.steps.length > 0) {
            result.steps[result.steps.length - 1].status = "FAILED"
            result.steps[result.steps.length - 1].details = error.message
        }
    }

    return result
}

function generateMarkdownReport(result: TestResult): string {
    const lines: string[] = []

    lines.push("# Task 1: Validation of Google Vertex AI and Pinecone Integration")
    lines.push("")
    lines.push("## Overview")
    lines.push("")
    lines.push("This task validates that the system can successfully:")
    lines.push("1. Authenticate with Google Vertex AI")
    lines.push("2. Connect to the Pinecone vector database")
    lines.push("3. Retrieve relevant medical research papers")
    lines.push("")

    lines.push("## Test Execution")
    lines.push("")
    lines.push(`**Timestamp:** ${result.timestamp}`)
    lines.push(`**Status:** ${result.success ? "SUCCESS" : "FAILED"}`)
    lines.push("")

    lines.push("## Input")
    lines.push("")
    lines.push("```")
    lines.push(`Query: "${result.input}"`)
    lines.push("```")
    lines.push("")

    lines.push("## Execution Steps")
    lines.push("")

    result.steps.forEach((step, index) => {
        lines.push(`### Step ${index + 1}: ${step.step}`)
        lines.push("")
        lines.push(`**Status:** ${step.status}`)
        if (step.details) {
            lines.push(`**Details:** ${step.details}`)
        }
        lines.push("")
    })

    if (result.success && result.output) {
        lines.push("## Output")
        lines.push("")
        lines.push(`**Total Results Retrieved:** ${result.output.resultsCount}`)
        lines.push("")

        if (result.output.sampleResults.length > 0) {
            lines.push("### Sample Results")
            lines.push("")

            result.output.sampleResults.forEach((res, index) => {
                lines.push(`#### Result ${index + 1}`)
                lines.push("")
                lines.push(`**Relevance Score:** ${res.score.toFixed(4)}`)
                if (res.title) lines.push(`**Title:** ${res.title}`)
                if (res.authors) lines.push(`**Authors:** ${res.authors}`)
                if (res.journal) lines.push(`**Journal:** ${res.journal}`)
                if (res.pmcLink) lines.push(`**Link:** ${res.pmcLink}`)
                lines.push("")
            })
        }
    }

    if (result.error) {
        lines.push("## Error")
        lines.push("")
        lines.push("```")
        lines.push(result.error)
        lines.push("```")
        lines.push("")
    }

    lines.push("## Conclusion")
    lines.push("")
    if (result.success) {
        lines.push("Task 1 completed successfully. The system is able to:")
        lines.push("- Authenticate with Google Vertex AI")
        lines.push("- Generate embeddings using the text-embedding-005 model")
        lines.push("- Connect to the Pinecone vector database")
        lines.push("- Retrieve relevant medical research papers based on semantic similarity")
    } else {
        lines.push("Task 1 failed. Please review the error details above.")
    }
    lines.push("")

    // Add raw output section
    if (result.rawOutput) {
        lines.push("## Raw Output")
        lines.push("")
        lines.push("Complete JSON response from Pinecone:")
        lines.push("")
        lines.push("```json")
        lines.push(JSON.stringify(result.rawOutput, null, 2))
        lines.push("```")
        lines.push("")
    }

    return lines.join("\n")
}

async function main() {
    console.log("Running Task 1 Validation...")
    console.log("")

    const result = await runTask1Validation()

    // Generate markdown report
    const markdown = generateMarkdownReport(result)

    // Save to file
    const outputPath = path.join(process.cwd(), "tasks", "task1-validation-report.md")
    fs.writeFileSync(outputPath, markdown)

    console.log(`Report saved to: ${outputPath}`)
    console.log("")
    console.log(`Status: ${result.success ? "SUCCESS" : "FAILED"}`)

    if (!result.success) {
        process.exit(1)
    }
}

main()
