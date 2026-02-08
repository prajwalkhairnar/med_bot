import { ChatVertexAI } from "@langchain/google-vertexai"
import { StateAnnotation } from "../retrieval_graph/state.js"
import { getMessageText } from "../utils/getMessageText.js"
import { z } from "zod"

/**
 * Scope Classifier Node
 * 
 * Determines if the user's query is within the medical domain.
 * Uses Google Vertex AI (Gemini) to classify queries as medical or non-medical.
 * 
 * Medical queries include:
 * - Questions about diseases, conditions, symptoms
 * - Medical treatments, medications, procedures
 * - Health-related research, clinical studies
 * - Anatomy, physiology, pathology
 * - Public health, epidemiology
 * 
 * Non-medical queries include:
 * - General knowledge questions
 * - Personal advice unrelated to medicine
 * - Technical questions about other domains
 * - Casual conversation
 */

// Zod schema for classification validation
const ClassificationSchema = z.enum(["MEDICAL", "NON-MEDICAL"], {
    errorMap: () => ({ message: "Classification must be either 'MEDICAL' or 'NON-MEDICAL'" })
})

const CLASSIFICATION_PROMPT = `<task>
You are a medical domain classifier. Your job is to determine if a user's question is related to medicine, healthcare, or medical research.
</task>

<instructions>
Respond with ONLY "MEDICAL" or "NON-MEDICAL" - nothing else.
</instructions>

<medical_topics>
Medical topics include:
- Diseases, conditions, symptoms, diagnoses
- Treatments, medications, procedures, therapies
- Medical research, clinical studies, trials
- Anatomy, physiology, pathology, biology
- Public health, epidemiology, healthcare systems
- Medical devices, diagnostics, imaging
- Nutrition and health, mental health
</medical_topics>

<non_medical_topics>
Non-medical topics include:
- General knowledge (history, geography, etc.)
- Technology (unless medical technology)
- Entertainment, sports, hobbies
- Personal advice unrelated to health
- Casual conversation
</non_medical_topics>

<user_question>
{query}
</user_question>

<output>
Classification:`

export async function scopeClassifier(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const userQuery = getMessageText(state.messages[state.messages.length - 1])

    // Initialize Gemini model for classification
    const model = new ChatVertexAI({
        model: "gemini-2.0-flash-001",
        temperature: 0, // Use deterministic output for classification
        maxOutputTokens: 10 // We only need "MEDICAL" or "NON-MEDICAL"
    })

    try {
        const prompt = CLASSIFICATION_PROMPT.replace("{query}", userQuery)
        const response = await model.invoke(prompt)

        // Extract and clean the classification from the response
        const rawClassification = response.content.toString().trim().toUpperCase()

        // Validate using Zod schema
        const validatedClassification = ClassificationSchema.parse(rawClassification)

        // Determine if the query is medical
        const isMedical = validatedClassification === "MEDICAL"

        console.log(`[Scope Classifier] Query: "${userQuery}"`)
        console.log(`[Scope Classifier] Classification: ${validatedClassification}`)
        console.log(`[Scope Classifier] Is Medical: ${isMedical}`)

        return { isMedicalQuery: isMedical }
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("[Scope Classifier] Validation error - LLM returned invalid classification:", error.errors)
            console.error("[Scope Classifier] Defaulting to medical classification for safety")
        } else {
            console.error("[Scope Classifier] Error during classification:", error)
        }
        // Default to treating as medical query to avoid blocking legitimate questions
        return { isMedicalQuery: true }
    }
}
