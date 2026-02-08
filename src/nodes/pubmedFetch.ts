import { StateAnnotation } from "../retrieval_graph/state.js"
import { Document } from "@langchain/core/documents"

/**
 * Fetches abstracts and publication dates from PubMed API for retrieved documents
 * Uses the PMID from document metadata to enrich with abstracts (for LLM context)
 * and publication dates (for sorting by recency)
 */
export async function pubmedFetch(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const { retrievedDocs } = state

    // If no documents were retrieved, return early
    if (!retrievedDocs || retrievedDocs.length === 0) {
        return { retrievedDocs: [] }
    }

    // Extract PMIDs from retrieved documents
    const pmids = retrievedDocs
        .map(doc => doc.metadata.pmid)
        .filter(pmid => pmid && pmid !== "0") // Filter out missing or invalid PMIDs

    // If no valid PMIDs, return documents as-is
    if (pmids.length === 0) {
        console.log("No valid PMIDs found in retrieved documents")
        return { retrievedDocs }
    }

    try {
        // Fetch abstracts and metadata from PubMed EFetch API (returns XML)
        const pmidList = pmids.join(",")
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmidList}&retmode=xml`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`PubMed API request failed: ${response.statusText}`)
        }

        const xmlText = await response.text()

        // Parse XML to extract abstracts and dates
        const enrichedMetadataMap = new Map<string, any>()

        // Simple XML parsing for PubMed articles
        // Each article is wrapped in <PubmedArticle>...</PubmedArticle>
        const articleMatches = xmlText.matchAll(/<PubmedArticle>(.*?)<\/PubmedArticle>/gs)

        for (const match of articleMatches) {
            const articleXml = match[1]

            // Extract PMID
            const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/)
            if (!pmidMatch) continue
            const pmid = pmidMatch[1]

            // Extract Abstract (may have multiple AbstractText elements)
            const abstractTexts: string[] = []
            const abstractMatches = articleXml.matchAll(/<AbstractText[^>]*>(.*?)<\/AbstractText>/gs)
            for (const absMatch of abstractMatches) {
                // Remove any remaining XML tags and decode HTML entities
                let text = absMatch[1]
                    .replace(/<[^>]+>/g, '') // Remove XML tags
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .trim()
                if (text) {
                    abstractTexts.push(text)
                }
            }
            const abstract = abstractTexts.join(' ')

            // Extract Publication Date
            // Try PubDate first (from <PubDate> in <Article>)
            let pubDate = ""
            const pubDateMatch = articleXml.match(/<PubDate>(.*?)<\/PubDate>/s)
            if (pubDateMatch) {
                const pubDateXml = pubDateMatch[1]
                const yearMatch = pubDateXml.match(/<Year>(\d+)<\/Year>/)
                const monthMatch = pubDateXml.match(/<Month>(\w+)<\/Month>/)
                const dayMatch = pubDateXml.match(/<Day>(\d+)<\/Day>/)

                const year = yearMatch ? yearMatch[1] : ""
                const month = monthMatch ? monthMatch[1] : ""
                const day = dayMatch ? dayMatch[1] : ""

                pubDate = [year, month, day].filter(Boolean).join(" ")
            }

            // If no PubDate, try ArticleDate
            if (!pubDate) {
                const articleDateMatch = articleXml.match(/<ArticleDate[^>]*>(.*?)<\/ArticleDate>/s)
                if (articleDateMatch) {
                    const articleDateXml = articleDateMatch[1]
                    const yearMatch = articleDateXml.match(/<Year>(\d+)<\/Year>/)
                    const monthMatch = articleDateXml.match(/<Month>(\d+)<\/Month>/)
                    const dayMatch = articleDateXml.match(/<Day>(\d+)<\/Day>/)

                    const year = yearMatch ? yearMatch[1] : ""
                    const month = monthMatch ? monthMatch[1] : ""
                    const day = dayMatch ? dayMatch[1] : ""

                    pubDate = [year, month, day].filter(Boolean).join("-")
                }
            }

            enrichedMetadataMap.set(pmid, {
                pubmed_abstract: abstract || "",
                pubmed_date: pubDate || ""
            })
        }

        // Enrich documents with PubMed metadata
        const enrichedDocs = retrievedDocs.map(doc => {
            const pmid = doc.metadata.pmid
            const enrichedMetadata = enrichedMetadataMap.get(pmid)

            if (enrichedMetadata) {
                return new Document({
                    pageContent: doc.pageContent,
                    metadata: {
                        ...doc.metadata,
                        ...enrichedMetadata,
                        pubmed_enriched: true
                    }
                })
            }

            // If no enrichment available, return original document
            return doc
        })

        console.log(`Enriched ${enrichedMetadataMap.size} out of ${retrievedDocs.length} documents with PubMed abstracts and dates`)

        return { retrievedDocs: enrichedDocs }

    } catch (error) {
        console.error("Error fetching PubMed metadata:", error)
        // On error, return original documents without enrichment
        return { retrievedDocs }
    }
}
