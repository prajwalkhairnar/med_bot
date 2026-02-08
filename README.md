# Medical Research Chatbot

A LangGraph-based medical chatbot that retrieves and synthesizes information from over 2 million PubMed research papers using vector search and LLM-powered response generation.

## Overview

This project implements an intelligent medical research assistant that:

- Classifies queries to ensure they are within the medical domain
- Optimizes user queries for better vector search results
- Retrieves relevant research papers from a Pinecone vector database
- Enriches results with full abstracts and publication dates from PubMed
- Generates natural language responses synthesizing multiple research papers
- Provides citations with PMIDs and publication dates

## Architecture

The system uses a LangGraph workflow with the following nodes:

```
START → Scope Classifier → Query Parser → Vector Search → PubMed Fetch → Research Summarizer → Response Generator → END
```

### Key Components

**Scope Classifier**: Determines if queries are medical-related using Gemini 2.0 Flash
- Routes medical queries to vector search
- Returns out-of-scope responses for non-medical queries

**Query Parser**: Optimizes conversational queries for vector search
- Removes filler words and adds medical terminology
- Example: "Can you tell me about treatments for high blood pressure?" → "hypertension treatment management therapeutic interventions"

**Vector Search**: Retrieves relevant papers from Pinecone
- 2,063,475 indexed PubMed articles
- Uses Google Vertex AI text-embedding-005 (768 dimensions)
- Returns top 10 most relevant papers

**PubMed Fetch**: Enriches results with full abstracts and dates
- Fetches complete abstracts (avg 2000+ characters)
- Adds publication dates for temporal context
- 93.3% average enrichment rate

**Research Summarizer**: Creates chronological summaries of research
- Organizes papers by publication date
- Preserves key findings and methodologies
- Highlights contradictions and evolving understanding

**Response Generator**: Synthesizes final natural language responses
- Cites specific papers with PMIDs and dates
- Acknowledges limitations and contradictions
- Provides comprehensive yet accessible medical information

## Technology Stack

- **LangGraph.js**: Workflow orchestration
- **Google Vertex AI**: Embeddings (text-embedding-005) and LLM (Gemini 2.0 Flash)
- **Pinecone**: Vector database with 2M+ medical papers
- **PubMed E-utilities**: Research paper metadata and abstracts
- **TypeScript**: Type-safe implementation

## Setup

### Prerequisites

1. Node.js and npm installed
2. Google Cloud account with Vertex AI API enabled
3. Pinecone account with access to the medical papers index

### Environment Variables

Create a `.env` file with the following:

```bash
# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=pubmed-articles

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional: LangSmith for debugging
LANGSMITH_API_KEY=your-langsmith-key
```

### Google Cloud Authentication

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set your project
gcloud config set project your-project-id

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com
```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Development Server

Start the LangGraph development server:

```bash
npm run dev
```

The server will run on `http://localhost:2024` and can be accessed via LangGraph Studio.

### Running Validation Scripts

Each feature has a comprehensive validation script:

```bash
# Task 1: Validate Google Vertex AI and Pinecone integration
npx tsx tasks/task1-graph-validation.ts

# Task 2: Validate scope classifier
npx tsx tasks/task2-validation.ts

# Task 3: Validate query parser
npx tsx tasks/task3-validation.ts

# Task 4: Validate PubMed API integration
npx tsx tasks/task4-validation.ts

# Task 5: Validate LLM response generation
npx tsx tasks/task5-validation.ts
```

Each validation script generates a detailed markdown report in the `tasks/` directory.

## Project Structure

```
.
├── src/
│   ├── retrieval_graph/
│   │   ├── graph.ts              # Main graph definition
│   │   └── state.ts              # Graph state schema
│   ├── nodes/
│   │   ├── scopeClassifier.ts    # Medical query classification
│   │   ├── outOfScopeResponse.ts # Non-medical query handler
│   │   ├── queryParser.ts        # Query optimization
│   │   ├── vectorSearch.ts       # Pinecone vector search
│   │   ├── pubmedFetch.ts        # PubMed API integration
│   │   ├── researchSummarizer.ts # Research summarization
│   │   ├── responseGenerator.ts  # Final response generation
│   │   └── noResultsResponse.ts  # No results handler
│   └── utils/
│       └── getMessageText.ts     # Helper utilities
├── tasks/
│   ├── task1-graph-validation.ts # End-to-end validation
│   ├── task2-validation.ts       # Scope classifier tests
│   ├── task3-validation.ts       # Query parser tests
│   ├── task4-validation.ts       # PubMed API tests
│   ├── task5-validation.ts       # LLM response tests
│   └── *.md                      # Validation reports
├── .env                          # Environment variables
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── langgraph.json               # LangGraph CLI configuration
├── PROJECT_PLAN.md              # Detailed implementation plan
└── Instructions.md              # Original requirements
```

## Performance Metrics

Based on validation testing:

- **Scope Classification**: 100% accuracy, ~500-900ms average
- **Query Parsing**: 100% success rate, ~1647ms average
- **Vector Search**: Consistently retrieves 10 relevant documents
- **PubMed Enrichment**: 93.3% success rate, ~5211ms average
- **End-to-End Response**: ~22,514ms average for complete workflow

## Example Query

**Input**: "What are the latest treatments for type 2 diabetes?"

**Process**:
1. Classified as medical query
2. Parsed to: "type 2 diabetes treatment management therapeutic interventions latest"
3. Retrieved 10 relevant papers from Pinecone
4. Enriched with full abstracts and publication dates
5. Summarized research chronologically (2016-2025)
6. Generated comprehensive response citing specific papers

**Output**: Natural language response covering pharmacological interventions, digital health solutions, and lifestyle modifications, with citations to specific research papers including PMIDs and publication years.

## Development

### Commands

```bash
npm run dev       # Start development server
npm run build     # Compile TypeScript
npm run lint      # Run ESLint
npm run format    # Format with Prettier
```

### Important Notes

- **Embedding Model**: Must use Google Vertex AI `text-embedding-005` (768 dimensions) to match Pinecone index
- **Pinecone Access**: Read-only access to pre-indexed database
- **ES Modules**: Use `.js` extensions in import paths even for `.ts` files
- **TypeScript Execution**: Use `tsx` for running scripts that import graph code

## Documentation

- `tasks/README.md`: Validation strategy and task documentation
- `tasks/*-report.md`: Detailed validation results for each feature


