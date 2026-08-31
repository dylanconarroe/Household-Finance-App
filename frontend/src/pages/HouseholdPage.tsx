import MemberCard from "../components/MemberCard"

import { useHousehold } from "../context/HouseholdContext"

function HouseholdPage() {
  const {
    selectedHousehold,
    isLoadingHouseholds,
  } = useHousehold()

  if (isLoadingHouseholds) {
    return (
      <p className="text-gray-500">
        Loading household...
      </p>
    )
  }

  if (!selectedHousehold) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Household
        </h2>

        <p className="mt-2 text-gray-500">
          You don't have any households yet.
        </p>
      </>
    )
  }

  return (
    <>
      <h2 className="text-3xl font-bold">
        {selectedHousehold.name}
      </h2>

      <p className="mt-2 text-gray-500">
        Members of your household
      </p>

      <div className="mt-8 grid max-w-2xl gap-4">

        {selectedHousehold.members.map(
          (member) => (
            <MemberCard
              key={member.id}
              name={member.name}
            />
          ),
        )}

      </div>
    </>
  )
}

export default HouseholdPage