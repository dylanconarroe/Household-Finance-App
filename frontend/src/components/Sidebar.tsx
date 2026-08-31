import { NavLink } from "react-router"

import { useHousehold } from "../context/HouseholdContext"

function Sidebar() {
  const {
    households,
    selectedHouseholdId,
    setSelectedHouseholdId,
    isLoadingHouseholds,
  } = useHousehold()

  const linkStyle = ({
    isActive,
  }: {
    isActive: boolean
  }) =>
    `block w-full rounded-lg px-4 py-3 ${
      isActive
        ? "bg-gray-100 font-medium text-gray-900"
        : "text-gray-600 hover:bg-gray-100"
    }`

  return (
    <aside className="w-64 border-r border-gray-200 bg-white p-6">

      <h1 className="text-2xl font-bold">
        HouseSplit
      </h1>

      {/* Household selector */}
      <div className="mt-6">

        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Household
        </label>

        <select
          value={
            selectedHouseholdId ?? ""
          }
          disabled={
            isLoadingHouseholds ||
            households.length === 0
          }
          onChange={(event) =>
            setSelectedHouseholdId(
              Number(
                event.target.value,
              ),
            )
          }
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >

          {households.length === 0 && (
            <option value="">
              No households
            </option>
          )}

          {households.map(
            (household) => (
              <option
                key={household.id}
                value={household.id}
              >
                {household.name}
              </option>
            ),
          )}

        </select>

      </div>

      <nav className="mt-8 space-y-2">

        <NavLink
          to="/"
          end
          className={linkStyle}
        >
          Household
        </NavLink>

        <NavLink
          to="/receipts"
          className={linkStyle}
        >
          Receipts
        </NavLink>

        <NavLink
          to="/balances"
          className={linkStyle}
        >
          Balances
        </NavLink>

        <NavLink
          to="/rules"
          className={linkStyle}
        >
          Split Rules
        </NavLink>

      </nav>

    </aside>
  )
}

export default Sidebar