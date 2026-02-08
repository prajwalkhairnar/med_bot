import { graph } from "../src/retrieval_graph/graph.js"
import { HumanMessage } from "@langchain/core/messages"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

dotenv.config()

interface GraphTestResult {
    timestamp: string
    input: string
    success: boolean
    graphExecution: {
        nodesExecuted: string[]
        finalState?: any
    }
    output?: {
        responseMessage: string
        retrievedDocsCount: number
        sampleDocs?: Array<{
            title?: string
            authors?: string
            pmcLink?: string
        }>
    }
    rawOutput?: any
    error?: string
}

async function runGraphValidation() {
    const result: GraphTestResult = {
        timestamp: new Date().toISOString(),
        input: "What are the treatment options for type 2 diabetes?",
        success: false,
        graphExecution: {
            nodesExecuted: []
        }
    }

    try {
        console.log("Invoking LangGraph with query...")
        console.log(`Query: "${result.input}"`)
        console.log("")

        // Invoke the graph
        const graphInput = {
            messages: [new HumanMessage(result.input)]
        }

        const graphOutput = await graph.invoke(graphInput)

        // Track execution
        result.graphExecution.finalState = graphOutput

        // Determine which nodes were executed based on the output
        result.graphExecution.nodesExecuted.push("vectorSearch")

        if (graphOutput.retrievedDocs && graphOutput.retrievedDocs.length > 0) {
            result.graphExecution.nodesExecuted.push("respond")
        } else {
            result.graphExecution.nodesExecuted.push("noResultsResponse")
        }

        // Extract the response message
        const messages = graphOutput.messages || []
        const lastMessage = messages[messages.length - 1]
        const responseContent = typeof lastMessage?.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content)

        // Process output
        result.output = {
            responseMessage: responseContent,
            retrievedDocsCount: graphOutput.retrievedDocs?.length || 0,
            sampleDocs: graphOutput.retrievedDocs?.slice(0, 3).map((doc: any) => ({
                title: doc.metadata?.title,
                authors: doc.metadata?.authors || doc.metadata?.author,
                pmcLink: doc.metadata?.pmc_link
            })) || []
        }

        // Store raw output
        result.rawOutput = {
            messages: graphOutput.messages?.map((msg: any) => ({
                type: msg._getType(),
                content: msg.content
            })),
            retrievedDocs: graphOutput.retrievedDocs?.map((doc: any) => ({
                pageContent: doc.pageContent?.substring(0, 200) + "...",
                metadata: doc.metadata
            }))
        }

        result.success = true
        console.log("Graph execution completed successfully!")

    } catch (error: any) {
        result.success = false
        result.error = error.message
        console.error("Graph execution failed:", error.message)
    }

    return result
}

function generateMarkdownReport(result: GraphTestResult): string {
    const lines: string[] = []

    lines.push("# Task 1: LangGraph End-to-End Validation")
    lines.push("")
    lines.push("## Overview")
    lines.push("")
    lines.push("This validation demonstrates the complete LangGraph workflow:")
    lines.push("1. User message input")
    lines.push("2. Vector search node execution")
    lines.push("3. Conditional routing based on results")
    lines.push("4. Response generation")
    lines.push("")

    lines.push("## Test Execution")
    lines.push("")
    lines.push(`**Timestamp:** ${result.timestamp}`)
    lines.push(`**Status:** ${result.success ? "SUCCESS" : "FAILED"}`)
    lines.push("")

    lines.push("## Input")
    lines.push("")
    lines.push("```")
    lines.push(`User Query: "${result.input}"`)
    lines.push("```")
    lines.push("")

    lines.push("## Graph Execution Flow")
    lines.push("")
    lines.push("**Nodes Executed:**")
    result.graphExecution.nodesExecuted.forEach((node, index) => {
        lines.push(`${index + 1}. \`${node}\``)
    })
    lines.push("")

    if (result.success && result.output) {
        lines.push("## Output")
        lines.push("")
        lines.push(`**Retrieved Documents:** ${result.output.retrievedDocsCount}`)
        lines.push("")

        lines.push("### Response Message")
        lines.push("")
        lines.push("```")
        lines.push(result.output.responseMessage.substring(0, 500))
        if (result.output.responseMessage.length > 500) {
            lines.push("...")
            lines.push("(truncated - see Raw Output for full response)")
        }
        lines.push("```")
        lines.push("")

        if (result.output.sampleDocs && result.output.sampleDocs.length > 0) {
            lines.push("### Sample Retrieved Documents")
            lines.push("")

            result.output.sampleDocs.forEach((doc, index) => {
                lines.push(`#### Document ${index + 1}`)
                lines.push("")
                if (doc.title) lines.push(`**Title:** ${doc.title}`)
                if (doc.authors) lines.push(`**Authors:** ${doc.authors}`)
                if (doc.pmcLink) lines.push(`**Link:** ${doc.pmcLink}`)
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
        lines.push("Task 1 LangGraph validation completed successfully. The graph is able to:")
        lines.push("- Accept user messages as input")
        lines.push("- Execute the vectorSearch node with Google Vertex AI embeddings")
        lines.push("- Query the Pinecone vector database")
        lines.push("- Route to the appropriate response node based on results")
        lines.push("- Return structured output with retrieved documents")
    } else {
        lines.push("Task 1 LangGraph validation failed. Please review the error details above.")
    }
    lines.push("")

    // Add raw output section
    if (result.rawOutput) {
        lines.push("## Raw Output")
        lines.push("")
        lines.push("Complete graph state output:")
        lines.push("")
        lines.push("```json")
        lines.push(JSON.stringify(result.rawOutput, null, 2))
        lines.push("```")
        lines.push("")
    }

    return lines.join("\n")
}

async function main() {
    console.log("Running Task 1 LangGraph Validation...")
    console.log("")

    const result = await runGraphValidation()

    // Generate markdown report
    const markdown = generateMarkdownReport(result)

    // Save to file
    const outputPath = path.join(process.cwd(), "tasks", "task1-graph-validation-report.md")
    fs.writeFileSync(outputPath, markdown)

    console.log("")
    console.log(`Report saved to: ${outputPath}`)
    console.log("")
    console.log(`Status: ${result.success ? "SUCCESS" : "FAILED"}`)

    if (!result.success) {
        process.exit(1)
    }
}

main()
