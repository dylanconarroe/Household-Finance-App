import {
  useEffect,
  useState,
} from "react"

type HouseholdMember = {
  id: number
  name: string
}

type ExpenseSplit = {
  id: number
  member_id: number
  amount: string
}

type ExpenseItem = {
  id: number
  description: string
  amount: string
  category: string
  splits: ExpenseSplit[]
}

type Expense = {
  id: number
  household_id: number
  paid_by: number
  merchant: string
  expense_date: string
  subtotal: string
  tax: string
  total: string
  items: ExpenseItem[]
}

type ExpenseHistoryProps = {
  householdId: number
  householdName: string
  members: HouseholdMember[]
  refreshKey?: number
}

function ExpenseHistory({
  householdId,
  householdName,
  members,
  refreshKey = 0,
}: ExpenseHistoryProps) {
  const [expenses, setExpenses] =
    useState<Expense[]>([])

  const [isLoading, setIsLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [
    deletingExpenseId,
    setDeletingExpenseId,
  ] = useState<number | null>(null)

  const [
    isClearingAll,
    setIsClearingAll,
  ] = useState(false)

  async function loadExpenses() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/expenses/?household_id=${householdId}`,
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load saved expenses.",
        )
      }

      const data: Expense[] =
        await response.json()

      setExpenses(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to load saved expenses.",
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setExpenses([])
    loadExpenses()
  }, [householdId, refreshKey])

  async function deleteExpense(
    expense: Expense,
  ) {
    const confirmed =
      window.confirm(
        `Delete ${expense.merchant} for ${formatMoney(expense.total)}?`,
      )

    if (!confirmed) {
      return
    }

    setDeletingExpenseId(
      expense.id,
    )

    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/expenses/${expense.id}?household_id=${householdId}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to delete expense.",
          ),
        )
      }

      setExpenses(
        (currentExpenses) =>
          currentExpenses.filter(
            (currentExpense) =>
              currentExpense.id !==
              expense.id,
          ),
      )
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to delete expense.",
        )
      }
    } finally {
      setDeletingExpenseId(
        null,
      )
    }
  }

  async function clearAllExpenses() {
    if (expenses.length === 0) {
      return
    }

    const confirmed =
      window.confirm(
        `Delete ALL saved expenses for "${householdName}"?\n\nThis will reset its calculated balances, but will not delete the household, members, category mappings, or split rules.`,
      )

    if (!confirmed) {
      return
    }

    setIsClearingAll(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/expenses/?household_id=${householdId}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to clear expenses.",
          ),
        )
      }

      setExpenses([])
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to clear expenses.",
        )
      }
    } finally {
      setIsClearingAll(false)
    }
  }

  function getPayerName(
    memberId: number,
  ) {
    return (
      members.find(
        (member) =>
          member.id === memberId,
      )?.name ??
      `Member ${memberId}`
    )
  }

  return (
    <div className="mt-8 max-w-4xl rounded-xl border border-gray-200 bg-white p-6">

      <div className="flex items-start justify-between gap-4">

        <div>
          <h3 className="text-xl font-semibold">
            Saved Expenses
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Previously saved receipts
            for {householdName}.
          </p>
        </div>

        <button
          type="button"
          onClick={loadExpenses}
          disabled={isLoading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
        >
          {isLoading
            ? "Loading..."
            : "Refresh"}
        </button>

      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading &&
      expenses.length === 0 ? (
        <p className="mt-6 text-gray-500">
          Loading saved expenses...
        </p>
      ) : expenses.length === 0 ? (
        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          No saved expenses for this
          household.
        </div>
      ) : (
        <>
          <div className="mt-5 divide-y divide-gray-200">

            {expenses.map(
              (expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-6 py-5"
                >

                  <div>
                    <h4 className="font-semibold">
                      {expense.merchant}
                    </h4>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(
                        expense.expense_date,
                      )}
                      {" · "}
                      Paid by{" "}
                      {getPayerName(
                        expense.paid_by,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {
                        expense.items
                          .length
                      }{" "}
                      {expense.items
                        .length === 1
                        ? "item"
                        : "items"}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">

                    <span className="text-lg font-bold">
                      {formatMoney(
                        expense.total,
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        deleteExpense(
                          expense,
                        )
                      }
                      disabled={
                        deletingExpenseId ===
                        expense.id
                      }
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:text-gray-400"
                    >
                      {deletingExpenseId ===
                      expense.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </div>

                </div>
              ),
            )}

          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">

            <button
              type="button"
              onClick={
                clearAllExpenses
              }
              disabled={
                isClearingAll
              }
              className="rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:text-gray-400"
            >
              {isClearingAll
                ? "Clearing..."
                : "Clear All Expenses"}
            </button>

            <p className="mt-2 text-xs text-gray-400">
              This removes saved
              expenses and resets their
              effect on balances. Split
              rules and learned category
              mappings are kept.
            </p>

          </div>
        </>
      )}

    </div>
  )
}

async function getErrorMessage(
  response: Response,
  defaultMessage: string,
) {
  try {
    const data =
      await response.json()

    if (
      typeof data.detail ===
      "string"
    ) {
      return data.detail
    }

    if (data.detail) {
      return JSON.stringify(
        data.detail,
      )
    }
  } catch {
    // Use default message.
  }

  return defaultMessage
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

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  )
}

export default ExpenseHistory