import {
  useEffect,
  useState,
} from "react"

import {
  useHousehold,
} from "../context/HouseholdContext"

type MemberBalance = {
  member_id: number
  name: string
  paid: string
  owed: string
  balance: string
}

type HouseholdBalances = {
  household_id: number
  balances: MemberBalance[]
}

type Settlement = {
  from: string
  to: string
  amount: number
}

function BalancesPage() {
  const {
    selectedHousehold,
    selectedHouseholdId,
  } = useHousehold()

  const [balances, setBalances] =
    useState<HouseholdBalances | null>(null)

  const [isLoading, setIsLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  async function loadBalances() {
    if (selectedHouseholdId === null) {
      setBalances(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHouseholdId}/balances`,
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load balances.",
        )
      }

      const data: HouseholdBalances =
        await response.json()

      setBalances(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Something went wrong.",
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setBalances(null)
    setError(null)

    loadBalances()
  }, [selectedHouseholdId])

  if (!selectedHousehold) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Balances
        </h2>

        <p className="mt-2 text-gray-500">
          Create or select a household
          to view balances.
        </p>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Balances
        </h2>

        <p className="mt-2 text-gray-500">
          {selectedHousehold.name}
        </p>

        <p className="mt-6 text-gray-500">
          Loading balances...
        </p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Balances
        </h2>

        <p className="mt-2 text-gray-500">
          {selectedHousehold.name}
        </p>

        <div className="mt-6 max-w-2xl rounded-xl bg-red-50 p-4 text-red-600">
          {error}
        </div>

        <button
          onClick={loadBalances}
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          Try Again
        </button>
      </>
    )
  }

  const settlements =
    balances
      ? calculateSettlements(
          balances.balances,
        )
      : []

  return (
    <>
      <div className="flex max-w-5xl items-center justify-between">

        <div>
          <h2 className="text-3xl font-bold">
            Balances
          </h2>

          <p className="mt-2 text-gray-500">
            {selectedHousehold.name}
          </p>
        </div>

        <button
          onClick={loadBalances}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Refresh
        </button>

      </div>

      {/* Member balances */}
      <div className="mt-8 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-3">

        {balances?.balances.map(
          (member) => {
            const balance =
              Number(member.balance)

            return (
              <div
                key={member.member_id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <h3 className="text-xl font-semibold">
                  {member.name}
                </h3>

                <div className="mt-6 space-y-3">

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Paid
                    </span>

                    <span className="font-medium">
                      {formatMoney(
                        member.paid,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Share
                    </span>

                    <span className="font-medium">
                      {formatMoney(
                        member.owed,
                      )}
                    </span>
                  </div>

                </div>

                <div className="mt-5 border-t border-gray-200 pt-5">

                  <div className="flex items-center justify-between">

                    <span className="font-medium">
                      Balance
                    </span>

                    <span
                      className={`text-xl font-bold ${
                        balance > 0
                          ? "text-green-600"
                          : balance < 0
                            ? "text-red-600"
                            : "text-gray-700"
                      }`}
                    >
                      {formatBalance(
                        balance,
                      )}
                    </span>

                  </div>

                </div>
              </div>
            )
          },
        )}

      </div>

      {/* Settlement plan */}
      <div className="mt-8 max-w-5xl rounded-xl border border-gray-200 bg-white p-6">

        <h3 className="text-xl font-semibold">
          Who Owes Who
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Payments needed to settle
          {` ${selectedHousehold.name}'s `}
          balances.
        </p>

        {settlements.length === 0 ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-700">
            Everyone is settled up.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-200">

            {settlements.map(
              (settlement, index) => (
                <div
                  key={`${settlement.from}-${settlement.to}-${index}`}
                  className="flex items-center justify-between py-4"
                >

                  <div className="flex items-center gap-3">

                    <span className="font-semibold">
                      {settlement.from}
                    </span>

                    <span className="text-gray-400">
                      →
                    </span>

                    <span className="font-semibold">
                      {settlement.to}
                    </span>

                  </div>

                  <span className="text-lg font-bold">
                    {formatMoney(
                      settlement.amount,
                    )}
                  </span>

                </div>
              ),
            )}

          </div>
        )}

      </div>
    </>
  )
}

function calculateSettlements(
  balances: MemberBalance[],
): Settlement[] {
  const creditors = balances
    .filter(
      (member) =>
        Number(member.balance) > 0,
    )
    .map((member) => ({
      name: member.name,

      amount: Math.round(
        Number(member.balance) * 100,
      ),
    }))

  const debtors = balances
    .filter(
      (member) =>
        Number(member.balance) < 0,
    )
    .map((member) => ({
      name: member.name,

      amount: Math.abs(
        Math.round(
          Number(member.balance) * 100,
        ),
      ),
    }))

  const settlements: Settlement[] = []

  let creditorIndex = 0
  let debtorIndex = 0

  while (
    creditorIndex < creditors.length &&
    debtorIndex < debtors.length
  ) {
    const creditor =
      creditors[creditorIndex]

    const debtor =
      debtors[debtorIndex]

    const payment = Math.min(
      creditor.amount,
      debtor.amount,
    )

    if (payment > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: payment / 100,
      })
    }

    creditor.amount -= payment
    debtor.amount -= payment

    if (creditor.amount === 0) {
      creditorIndex++
    }

    if (debtor.amount === 0) {
      debtorIndex++
    }
  }

  return settlements
}

function formatMoney(
  value: string | number,
) {
  return Number(value).toLocaleString(
    "en-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  )
}

function formatBalance(
  balance: number,
) {
  const amount =
    formatMoney(
      Math.abs(balance),
    )

  if (balance > 0) {
    return `+${amount}`
  }

  if (balance < 0) {
    return `-${amount}`
  }

  return amount
}

export default BalancesPage