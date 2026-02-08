import { END, START, StateGraph } from "@langchain/langgraph"
import { StateAnnotation, InputStateAnnotation } from "./state.js"
import { respond } from "../nodes/respond.js"
import { vectorSearch } from "../nodes/vectorSearch.js"
import { noResultsResponse } from "../nodes/noResultsResponse.js"
import { scopeClassifier } from "../nodes/scopeClassifier.js"
import { outOfScopeResponse } from "../nodes/outOfScopeResponse.js"
import { queryParser } from "../nodes/queryParser.js"
import { pubmedFetch } from "../nodes/pubmedFetch.js"


const builder = new StateGraph({
    stateSchema: StateAnnotation,
    input: InputStateAnnotation
})
    .addNode("scopeClassifier", scopeClassifier)
    .addNode("queryParser", queryParser)
    .addNode("vectorSearch", vectorSearch)
    .addNode("pubmedFetch", pubmedFetch)
    .addNode("respond", respond)
    .addNode("noResultsResponse", noResultsResponse)
    .addNode("outOfScopeResponse", outOfScopeResponse)
    .addEdge(START, "scopeClassifier")
    .addConditionalEdges("scopeClassifier", (state) => (state.isMedicalQuery).toString(), {
        true: "queryParser",
        false: "outOfScopeResponse"
    })
    .addEdge("queryParser", "vectorSearch")
    .addConditionalEdges("vectorSearch", (state) => (state.retrievedDocs.length > 0).toString(), {
        true: "pubmedFetch",
        false: "noResultsResponse"
    })
    .addEdge("pubmedFetch", "respond")
    .addEdge("outOfScopeResponse", END)
    .addEdge("noResultsResponse", END)
    .addEdge("respond", END)

export const graph = builder.compile({
    interruptBefore: [],
    interruptAfter: []
})

graph.name = "Demo Graph"
