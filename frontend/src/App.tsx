import { useEffect, useState } from "react"
import MemberCard from "./components/MemberCard"

type Member = {
  id: number
  name: string
}

type Household = {
  id: number
  name: string
  members: Member[]
}

function App() {
  const [household, setHousehold] = useState<Household | null>(null)

  useEffect(() => {
    fetch("http://localhost:8000/households/1")
      .then((response) => response.json())
      .then((data) => {
        setHousehold(data)
      })
  }, [])

  if (!household) {
    return <div className="p-10">Loading...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      <aside className="w-64 border-r border-gray-200 bg-white p-6">
        <h1 className="mb-8 text-2xl font-bold">
          HouseSplit
        </h1>

        <nav className="space-y-2">
          <button className="w-full rounded-lg bg-gray-100 px-4 py-3 text-left font-medium">
            Household
          </button>

          <button className="w-full rounded-lg px-4 py-3 text-left text-gray-600 hover:bg-gray-100">
            Receipts
          </button>

          <button className="w-full rounded-lg px-4 py-3 text-left text-gray-600 hover:bg-gray-100">
            Balances
          </button>

          <button className="w-full rounded-lg px-4 py-3 text-left text-gray-600 hover:bg-gray-100">
            Split Rules
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold">
          {household.name}
        </h2>

        <p className="mt-2 text-gray-500">
          Members of your household
        </p>

        <div className="mt-8 grid max-w-2xl gap-4">
          {household.members.map((member) => (
            <MemberCard
              key={member.id}
              name={member.name}
            />
          ))}
        </div>
      </main>

    </div>
  )
}

export default App