# HouseSplit Application



HouseSplit is a full-stack household finance application designed to make splitting bills and expenses between roommates easier. 



Instead of manually calculating who owes who what after every grocery trip or shared purchase, my application is designed to process receipt information, categorize each item, apply saved splitting rules, and calculate each household member's balance. 



Currently it is built around a three-person household (my current situation) but the end goal is for households to be able to define their own members, categories, and splitting rules. 



### Features



Current functionality includes:



* Create and manage household members
* Process receipts and individual receipt items
* Categorize purchased items
* Automatically split items between selected household members
* Save category-based splitting rules
* Override saved splitting rules for individual items
* Create new categories when reviewing receipts
* Remember previously confirmed item categories
* Calculate how much each member paid
* Calculate how much each member owes
* Calculate overall household balances
* Split receipt tax evenly between household members
* Validate receipt subtotal and total calculations
* Review and edit receipt information before saving



### Receipt Categorization



HouseSplit uses a combination of saved mappings and local AI categorization.



When an item is processed:



1. HouseSplit first checks whether the item has a previously confirmed category.
2. If a saved mapping exists, that category is reused automatically.
3. If no mapping exists, a locally running AI model attempts to categorize the item.
4. The user can review and correct the category.
5. Confirmed mappings can be saved and automatically reused on future receipts.



This allows the application to require less manual work over time.



### Splitting Rules



Items can be divided between household members using category-based rules.



For example:



Groceries → split between all household members

Household Supplies → split between all household members

Drinks → split between selected household members



Users can override the default rule for an individual item without changing the saved category rule.



If HouseSplit encounters a category without an existing splitting rule, the user is prompted to choose which household members should share the item. That selection can optionally be saved as the default rule for that category.



Currently, item costs are divided equally between selected members.



Receipt tax is handled separately and is divided evenly between all household members.



### Technologies



#### Frontend

* React
* TypeScript
* Vite
* Node.js
* npm
* Oxlint



#### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* PostgreSQL



#### Receipt Processing and AI

* AWS Textract for receipt OCR and data extraction
* Ollama for running AI models locally
* Qwen3 8B for receipt-item categorization



### Running Project Locally



#### Prerequisites



You will need:



* Python 3
* PostgreSQL
* Node.js
* npm
* Ollama
* Git



AWS credentials are also required for functionality that uses AWS Textract.



**1. Clone the Repository** - git clone <your-github-repository-url> cd house-split

&#x09;

**2. Start PostgreSQL** - The backend must be configured with access to the PostgreSQL database used by HouseSplit.



**3. Set Up the Backend**



Move into the backend:



cd backend



Create a Python virtual environment:



python3 -m venv .venv



Activate it:



source .venv/bin/activate



Install the backend dependencies required by the project.



Then start the FastAPI development server:



uvicorn app.main:app --reload



By default, FastAPI should be available at:



http://127.0.0.1:8000



FastAPI's interactive API documentation can be viewed at:



http://127.0.0.1:8000/docs



**4. Start Ollama**



Make sure Ollama is installed and running.



The project currently uses:



qwen3:8b



If the model is not already installed:



ollama pull qwen3:8b



**5. Set Up the Frontend**



Open another terminal and move into the frontend:



cd house-split/frontend



Install the frontend dependencies:



npm install



Start the Vite development server:



npm run dev



The frontend will normally be available at:



http://localhost:5173

