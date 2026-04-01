import { Client, handle_file } from "@gradio/client";

async function runPrediction() {
  try {
    // 1. Connect to the specific HF Space
    const app = await Client.connect("vpdiga-24/plant-idfire");

    // 2. Use handle_file to process your local image path.
    // handle_file automatically reads and prepares the file for the API.
    const result = await app.predict("/predict", [
      handle_file("plant.jpg")
    ]);

    // 3. Log the prediction result
    console.log("Prediction result:", result.data);
  } catch (err) {
    console.error("Error during prediction:", err);
  }
}

runPrediction();
