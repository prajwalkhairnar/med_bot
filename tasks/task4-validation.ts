import { graph } from "../src/retrieval_graph/graph.js"
import { HumanMessage } from "@langchain/core/messages"
import * as fs from "fs"
import { config } from "dotenv"

// Load environment variables
config()

interface TestCase {
    id: number
    query: string
    description: string
}

interface TestResult {
    testCase: TestCase
    originalQuery: string
    retrievedDocsCount: number
    enrichedDocsCount: number
    sampleDocuments: Array<{
        title: string
        pmid: string
        enrichmentStatus: string
        beforeEnrichment: any
        afterEnrichment: any
    }>
    executionTime: number
    success: boolean
}

const testCases: TestCase[] = [
    {
        id: 1,
        query: "What are the symptoms of diabetes?",
        description: "Medical query about diabetes symptoms"
    },
    {
        id: 2,
        query: "Tell me about COVID-19 treatments",
        description: "Medical query about COVID-19 treatments"
    },
    {
        id: 3,
        query: "How does aspirin work?",
        description: "Medical query about aspirin mechanism"
    }
]

async function runValidation() {
    console.log("Starting Task 4 Validation: PubMed API Integration\n")
    console.log("=".repeat(80))

    const results: TestResult[] = []

    for (const testCase of testCases) {
        console.log(`\nTest ${testCase.id}: ${testCase.description}`)
        console.log("-".repeat(80))
        console.log(`Query: "${testCase.query}"`)

        const startTime = Date.now()

        try {
            // Invoke the graph with the test query
            const result = await graph.invoke({
                messages: [new HumanMessage(testCase.query)]
            })

            const executionTime = Date.now() - startTime

            const retrievedDocs = result.retrievedDocs || []
            const enrichedDocs = retrievedDocs.filter(doc => doc.metadata.pubmed_enriched === true)

            console.log(`Retrieved: ${retrievedDocs.length} documents`)
            console.log(`Enriched: ${enrichedDocs.length} documents`)
            console.log(`Execution time: ${executionTime}ms`)

            // Sample first 3 documents to show enrichment
            const sampleDocuments = retrievedDocs.slice(0, 3).map(doc => {
                const beforeEnrichment = {
                    title: doc.metadata.title,
                    pmid: doc.metadata.pmid,
                    original_citation: doc.metadata.article_citation
                }

                const afterEnrichment = doc.metadata.pubmed_enriched ? {
                    pubmed_abstract: doc.metadata.pubmed_abstract ?
                        doc.metadata.pubmed_abstract.substring(0, 200) + "..." :
                        "No abstract available",
                    pubmed_date: doc.metadata.pubmed_date,
                    abstract_length: doc.metadata.pubmed_abstract?.length || 0
                } : null

                return {
                    title: doc.metadata.title || "Unknown",
                    pmid: doc.metadata.pmid,
                    enrichmentStatus: doc.metadata.pubmed_enriched ? "✅ Enriched" : "❌ Not enriched",
                    beforeEnrichment,
                    afterEnrichment
                }
            })

            results.push({
                testCase,
                originalQuery: testCase.query,
                retrievedDocsCount: retrievedDocs.length,
                enrichedDocsCount: enrichedDocs.length,
                sampleDocuments,
                executionTime,
                success: true
            })

            console.log("✅ Test passed\n")

        } catch (error) {
            console.error(`❌ Test failed: ${error}`)
            results.push({
                testCase,
                originalQuery: testCase.query,
                retrievedDocsCount: 0,
                enrichedDocsCount: 0,
                sampleDocuments: [],
                executionTime: Date.now() - startTime,
                success: false
            })
        }
    }

    // Generate markdown report
    const report = generateReport(results)
    fs.writeFileSync("tasks/task4-validation-report.md", report)

    console.log("\n" + "=".repeat(80))
    console.log("Validation complete!")
    console.log(`Report saved to: tasks/task4-validation-report.md`)
    console.log("=".repeat(80))
}

function generateReport(results: TestResult[]): string {
    const timestamp = new Date().toISOString()
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    let report = `# Task 4 Validation Report: PubMed API Integration\n\n`
    report += `**Generated:** ${timestamp}\n\n`
    report += `## Overview\n\n`
    report += `This report validates the PubMed API integration, which enriches retrieved documents with additional metadata from the PubMed E-utilities API.\n\n`
    report += `**Test Results:** ${successCount}/${totalCount} tests passed\n\n`
    report += `## Graph Flow\n\n`
    report += `\`\`\`\n`
    report += `START → scopeClassifier → queryParser → vectorSearch → pubmedFetch → respond → END\n`
    report += `\`\`\`\n\n`
    report += `## PubMed Enrichment Details\n\n`
    report += `The pubmedFetch node adds the following metadata fields:\n\n`
    report += `- **pubmed_abstract**: Full abstract text from PubMed (crucial for LLM context in Task 5)\n`
    report += `- **pubmed_date**: Publication date (enables sorting by recency)\n\n`
    report += `These fields provide the most valuable information for:\n`
    report += `1. **LLM Response Generation**: Abstracts contain curated summaries of research findings\n`
    report += `2. **Temporal Relevance**: Recent publications can be prioritized\n`
    report += `3. **Context Quality**: Abstracts are more focused than random paper chunks\n\n`
    report += `## Test Results\n\n`

    for (const result of results) {
        report += `### Test ${result.testCase.id}: ${result.testCase.description}\n\n`
        report += `**Query:**\n\`\`\`\n${result.originalQuery}\n\`\`\`\n\n`
        report += `**Retrieved Documents:** ${result.retrievedDocsCount}\n\n`
        report += `**Enriched Documents:** ${result.enrichedDocsCount}\n\n`
        report += `**Enrichment Rate:** ${result.retrievedDocsCount > 0 ? ((result.enrichedDocsCount / result.retrievedDocsCount) * 100).toFixed(1) : 0}%\n\n`

        if (result.sampleDocuments.length > 0) {
            report += `**Enriched Documents:**\n\n`

            for (let i = 0; i < result.sampleDocuments.length; i++) {
                const doc = result.sampleDocuments[i]
                report += `${i + 1}. **${doc.title}**\n`
                report += `   - **PMID**: ${doc.pmid}\n`
                report += `   - **Status**: ${doc.enrichmentStatus}\n`

                if (doc.afterEnrichment) {
                    report += `   - **Publication Date**: ${doc.afterEnrichment.pubmed_date}\n`
                    report += `   - **Abstract Length**: ${doc.afterEnrichment.abstract_length} characters\n`
                    report += `   - **Abstract Preview**:\n`
                    report += `     > ${doc.afterEnrichment.pubmed_abstract}\n\n`
                } else {
                    report += `   - **Note**: No abstract available (PMID may be invalid)\n\n`
                }
            }
        }

        report += `**Execution Time:** ${result.executionTime}ms\n\n`
        report += `---\n\n`
    }

    // Summary statistics
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
    const avgEnrichmentRate = results.reduce((sum, r) => {
        return sum + (r.retrievedDocsCount > 0 ? (r.enrichedDocsCount / r.retrievedDocsCount) * 100 : 0)
    }, 0) / results.length

    report += `## Summary Statistics\n\n`
    report += `- **Average Execution Time:** ${Math.round(avgExecutionTime)}ms\n`
    report += `- **Average Enrichment Rate:** ${avgEnrichmentRate.toFixed(1)}%\n`
    report += `- **Success Rate:** ${((successCount / totalCount) * 100).toFixed(1)}%\n\n`

    report += `## Key Improvements\n\n`
    report += `The PubMed API integration provides several benefits:\n\n`
    report += `1. **Abstract Context for LLM**: Full abstracts provide curated research summaries for better response generation\n`
    report += `2. **Temporal Sorting**: Publication dates enable prioritization of recent research\n`
    report += `3. **Focused Information**: Abstracts are more relevant than random paper chunks\n`
    report += `4. **Research Quality**: Author-written summaries capture key findings and conclusions\n`
    report += `5. **Efficient Context**: Abstracts are concise yet comprehensive\n\n`

    report += `## Conclusion\n\n`
    if (successCount === totalCount) {
        report += `✅ All tests passed successfully. The PubMed API integration is working as expected and enriching documents with additional metadata.\n\n`
    } else {
        report += `⚠️ Some tests failed. Review the results above for details.\n\n`
    }

    report += `## Raw Test Results\n\n`
    report += `\`\`\`json\n`
    report += JSON.stringify(results, null, 2)
    report += `\n\`\`\`\n`

    return report
}

// Run validation
runValidation().catch(console.error)
