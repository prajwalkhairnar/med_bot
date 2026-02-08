# Task Validation Reports

This folder contains validation scripts and reports for each task in the coding test.

## Structure

Each task has:
- `taskN-validation.ts` - Validation script that tests the functionality
- `taskN-validation-report.md` - Generated markdown report showing input, execution steps, and output

## Tasks

### Task 1: Google Vertex AI and Pinecone Integration
**Status:** COMPLETE
**Files:**
- `task1-validation.ts`
- `task1-validation-report.md`

**What it validates:**
- Google Vertex AI authentication
- Embedding generation (768-dimensional vectors)
- Pinecone vector database connection
- Retrieval of relevant medical research papers

### Task 2: Scope Classifier
**Status:** PENDING

**What it will validate:**
- Classification of medical vs non-medical questions
- Proper handling of out-of-scope queries
- Hardcoded response for non-medical questions

### Task 3: Query Parser
**Status:** PENDING

**What it will validate:**
- Conversion of natural language to optimized search queries
- Query enhancement for better vector search results

### Task 4: PubMed API Integration
**Status:** PENDING

**What it will validate:**
- Fetching paper metadata from PubMed API
- Enrichment of search results with additional paper details

### Task 5: LLM Response Generation
**Status:** PENDING

**What it will validate:**
- Natural language response generation using LLM
- Proper use of retrieved context
- Coherent medical information synthesis

## Running Validations

To run a task validation:

```bash
npx ts-node tasks/taskN-validation.ts
```

This will:
1. Execute the validation tests
2. Generate a markdown report
3. Save the report in this folder
4. Exit with code 0 (success) or 1 (failure)
