import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "./index.css"
import App from "./App.tsx"

import { HouseholdProvider } from "./context/HouseholdContext"

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <BrowserRouter>
      <HouseholdProvider>
        <App />
      </HouseholdProvider>
    </BrowserRouter>
  </StrictMode>,
)