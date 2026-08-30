import { Route, Routes } from "react-router"

import Sidebar from "./components/Sidebar"
import HouseholdPage from "./pages/HouseholdPage"
import ReceiptsPage from "./pages/ReceiptsPage"
import BalancesPage from "./pages/BalancesPage"
import SplitRulesPage from "./pages/SplitRulesPage"

function App() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-10">
        <Routes>
          <Route path="/" element={<HouseholdPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/balances" element={<BalancesPage />} />
          <Route path="/rules" element={<SplitRulesPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App