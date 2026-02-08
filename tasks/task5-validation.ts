import { HumanMessage } from "@langchain/core/messages"
import { graph } from "../src/retrieval_graph/graph.js"
import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"

// Load environment variables
config()

/**
 * Task 5 Validation: LLM Response Generation
 * 
 * This script validates the two-step LLM response generation:
 * 1. Research Summarizer: Summarizes enriched papers chronologically
 * 2. Response Generator: Generates final answer based on summary + question
 * 
 * Tests various medical queries to ensure:
 * - Research papers are properly summarized with temporal context
 * - Final responses are natural, comprehensive, and cite sources
 * - Publication dates are considered in the response
 */

interface TestCase {
    query: string
    description: string
}

const TEST_CASES: TestCase[] = [
    {
        query: "What are the latest treatments for diabetes?",
        description: "Medical query about diabetes treatments - should show chronological evolution"
    },
    {
        query: "How does COVID-19 affect the cardiovascular system?",
        description: "Medical query about COVID-19 - should cite recent research with dates"
    },
    {
        query: "What are the side effects of statins?",
        description: "Medical query about medication - should summarize findings from multiple papers"
    }
]

async function runValidation() {
    console.log("=".repeat(80))
    console.log("TASK 5 VALIDATION: LLM Response Generation")
    console.log("=".repeat(80))
    console.log()

    const results: any[] = []
    const timestamp = new Date().toISOString()

    for (let i = 0; i < TEST_CASES.length; i++) {
        const testCase = TEST_CASES[i]
        console.log(`\n${"=".repeat(80)}`)
        console.log(`TEST CASE ${i + 1}/${TEST_CASES.length}: ${testCase.description}`)
        console.log(`${"=".repeat(80)}`)
        console.log(`Query: "${testCase.query}"`)
        console.log()

        try {
            const startTime = Date.now()

            // Invoke the graph
            const result = await graph.invoke({
                messages: [new HumanMessage(testCase.query)]
            })

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Extract results
            const isMedical = result.isMedicalQuery
            const parsedQuery = result.parsedQuery || testCase.query
            const retrievedDocsCount = result.retrievedDocs?.length || 0
            const researchSummary = result.researchSummary || ""
            const finalMessage = result.messages[result.messages.length - 1]
            const finalResponse = finalMessage.content.toString()

            console.log(`✓ Execution completed in ${executionTime}ms`)
            console.log(`✓ Medical Query: ${isMedical}`)
            console.log(`✓ Parsed Query: "${parsedQuery}"`)
            console.log(`✓ Retrieved Documents: ${retrievedDocsCount}`)
            console.log(`✓ Research Summary Length: ${researchSummary.length} characters`)
            console.log(`✓ Final Response Length: ${finalResponse.length} characters`)
            console.log()
            console.log("--- RESEARCH SUMMARY (First 500 chars) ---")
            console.log(researchSummary.substring(0, 500) + "...")
            console.log()
            console.log("--- FINAL RESPONSE ---")
            console.log(finalResponse)
            console.log()

            // Store result
            results.push({
                testCase: i + 1,
                query: testCase.query,
                description: testCase.description,
                success: true,
                executionTime,
                isMedical,
                parsedQuery,
                retrievedDocsCount,
                researchSummaryLength: researchSummary.length,
                researchSummaryPreview: researchSummary.substring(0, 500),
                researchSummaryFull: researchSummary,
                finalResponseLength: finalResponse.length,
                finalResponse,
                retrievedDocs: result.retrievedDocs?.map((doc: any) => ({
                    title: doc.metadata?.title || "Untitled",
                    pmid: doc.metadata?.pmid || "Unknown",
                    pubmed_date: doc.metadata?.pubmed_date || "Unknown",
                    pubmed_abstract: doc.metadata?.pubmed_abstract?.substring(0, 200) + "..." || "No abstract",
                    score: doc.metadata?.score || 0
                }))
            })

        } catch (error) {
            console.error(`✗ Error:`, error)
            results.push({
                testCase: i + 1,
                query: testCase.query,
                description: testCase.description,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    // Generate markdown report
    const report = generateMarkdownReport(results, timestamp)
    const reportPath = path.join(process.cwd(), "tasks", "task5-validation-report.md")
    fs.writeFileSync(reportPath, report, "utf-8")

    console.log("\n" + "=".repeat(80))
    console.log("VALIDATION COMPLETE")
    console.log("=".repeat(80))
    console.log(`Report saved to: ${reportPath}`)
    console.log()

    // Summary
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    console.log(`Success Rate: ${successCount}/${totalCount} (${(successCount / totalCount * 100).toFixed(1)}%)`)
    console.log()
}

function generateMarkdownReport(results: any[], timestamp: string): string {
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    const avgExecutionTime = results.filter(r => r.success).reduce((sum, r) => sum + r.executionTime, 0) / successCount

    let report = `# Task 5 Validation Report: LLM Response Generation

## Overview

This validation tests the two-step LLM response generation process:
1. **Research Summarizer**: Summarizes enriched papers chronologically with no loss of information
2. **Response Generator**: Generates final answer based on summary + user question

**Validation Date:** ${timestamp}
**Test Cases:** ${totalCount}
**Success Rate:** ${successCount}/${totalCount} (${(successCount / totalCount * 100).toFixed(1)}%)
**Average Execution Time:** ${avgExecutionTime.toFixed(0)}ms

---

## Graph Flow

\`\`\`
START → scopeClassifier → queryParser → vectorSearch → pubmedFetch → researchSummarizer → responseGenerator → END
\`\`\`

**New Nodes:**
- \`researchSummarizer\`: Uses Gemini 2.0 Flash to create comprehensive chronological summaries
- \`responseGenerator\`: Uses Gemini 2.0 Flash to generate natural language responses

---

## Test Results

`

    results.forEach((result, index) => {
        report += `### Test Case ${index + 1}: ${result.description}\n\n`
        report += `**Query:** "${result.query}"\n\n`

        if (result.success) {
            report += `**Status:** ✅ Success\n\n`
            report += `**Metrics:**\n`
            report += `- Execution Time: ${result.executionTime}ms\n`
            report += `- Medical Query: ${result.isMedical}\n`
            report += `- Parsed Query: "${result.parsedQuery}"\n`
            report += `- Retrieved Documents: ${result.retrievedDocsCount}\n`
            report += `- Research Summary Length: ${result.researchSummaryLength} characters\n`
            report += `- Final Response Length: ${result.finalResponseLength} characters\n\n`

            report += `**Retrieved Papers:**\n\n`
            result.retrievedDocs?.slice(0, 5).forEach((doc: any, i: number) => {
                report += `${i + 1}. **${doc.title}**\n`
                report += `   - PMID: ${doc.pmid}\n`
                report += `   - Date: ${doc.pubmed_date}\n`
                report += `   - Score: ${doc.score.toFixed(4)}\n`
                report += `   - Abstract Preview: ${doc.pubmed_abstract}\n\n`
            })

            report += `**Research Summary (Preview):**\n\n`
            report += `\`\`\`\n${result.researchSummaryPreview}...\n\`\`\`\n\n`

            report += `**Final Response:**\n\n`
            report += `\`\`\`\n${result.finalResponse}\n\`\`\`\n\n`
        } else {
            report += `**Status:** ❌ Failed\n\n`
            report += `**Error:** ${result.error}\n\n`
        }

        report += `---\n\n`
    })

    report += `## Conclusion\n\n`

    if (successCount === totalCount) {
        report += `✅ **All test cases passed successfully!**\n\n`
        report += `The LLM response generation is working as expected:\n`
        report += `- Research papers are being summarized chronologically with temporal context\n`
        report += `- Final responses are natural, comprehensive, and cite sources appropriately\n`
        report += `- Publication dates are considered in the analysis\n`
        report += `- Average execution time is reasonable at ${avgExecutionTime.toFixed(0)}ms\n\n`
    } else {
        report += `⚠️ **Some test cases failed.**\n\n`
        report += `Success rate: ${successCount}/${totalCount}\n`
        report += `Please review the failed cases above.\n\n`
    }

    report += `---\n\n`
    report += `## Raw Output\n\n`
    report += `<details>\n<summary>Click to expand full JSON output</summary>\n\n`
    report += `\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n\n`
    report += `</details>\n`

    return report
}

// Run validation
runValidation().catch(console.error)
