import { useEffect, useState } from "react"
import MemberCard from "../components/MemberCard"

type Member = {
  id: number
  name: string
}

type Household = {
  id: number
  name: string
  members: Member[]
}

function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null)

  useEffect(() => {
    fetch("http://localhost:8000/households/1")
      .then((response) => response.json())
      .then((data) => {
        setHousehold(data)
      })
  }, [])

  if (!household) {
    return <p>Loading...</p>
  }

  return (
    <>
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
    </>
  )
}

export default HouseholdPage