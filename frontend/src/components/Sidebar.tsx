import { NavLink } from "react-router"

function Sidebar() {
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `block w-full rounded-lg px-4 py-3 ${
      isActive
        ? "bg-gray-100 font-medium text-gray-900"
        : "text-gray-600 hover:bg-gray-100"
    }`

  return (
    <aside className="w-64 border-r border-gray-200 bg-white p-6">
      <h1 className="mb-8 text-2xl font-bold">
        HouseSplit
      </h1>

      <nav className="space-y-2">
        <NavLink to="/" end className={linkStyle}>
          Household
        </NavLink>

        <NavLink to="/receipts" className={linkStyle}>
          Receipts
        </NavLink>

        <NavLink to="/balances" className={linkStyle}>
          Balances
        </NavLink>

        <NavLink to="/rules" className={linkStyle}>
          Split Rules
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar