from flask import Flask, jsonify, request
from transformers import T5ForConditionalGeneration, T5Tokenizer

app = Flask(__name__)

# Load the FLAN-T5 model and tokenizer
model_name = "google/flan-t5-base"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)

# Vocabulary recommendation endpoint
@app.route('/vocab', methods=['POST'])
def recommend_vocabulary():

    data = request.json
    word = data.get('word')

    context = f"Provide context for the word: {word}"
    
    inputs = tokenizer(context, return_tensors="pt")
    outputs = model.generate(inputs['input_ids'], max_length=50, num_beams=2, early_stopping=True)
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return jsonify({"context": response})

# Endpoint for generating personalized practice tests
@app.route('/generate-test', methods=['POST'])
def generate_test():
    data = request.json
    user_level = data.get('level')
    
    prompt = f"Create a test for {user_level} level on communication skills."
    
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(inputs['input_ids'], max_length=150, num_beams=3)
    
    test_questions = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return jsonify({"test": test_questions})

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
