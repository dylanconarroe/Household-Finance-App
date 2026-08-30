import { useEffect, useState } from "react"

import ReceiptReview, {
  type HouseholdMember,
  type ParsedReceipt,
  type ReceiptItem,
  type SplitRule,
} from "../components/ReceiptReview"

function ReceiptsPage() {
  const [file, setFile] = useState<File | null>(null)

  const [isParsing, setIsParsing] = useState(false)

  const [result, setResult] =
    useState<ParsedReceipt | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const [rules, setRules] =
    useState<SplitRule[]>([])

  const [householdMembers, setHouseholdMembers] =
    useState<HouseholdMember[]>([])

  const [loadError, setLoadError] =
    useState<string | null>(null)

  const [paidBy, setPaidBy] =
    useState<number | "">("")

  const [isSaving, setIsSaving] =
    useState(false)

  const [saveError, setSaveError] =
    useState<string | null>(null)

  const [saveSuccess, setSaveSuccess] =
    useState<string | null>(null)

  useEffect(() => {
    async function loadHouseholdData() {
      try {
        const [rulesResponse, householdResponse] =
          await Promise.all([
            fetch(
              "http://localhost:8000/households/1/rules/",
            ),

            fetch(
              "http://localhost:8000/households/1",
            ),
          ])

        if (!rulesResponse.ok) {
          throw new Error(
            "Failed to load split rules.",
          )
        }

        if (!householdResponse.ok) {
          throw new Error(
            "Failed to load household members.",
          )
        }

        const loadedRules: SplitRule[] =
          await rulesResponse.json()

        const household =
          await householdResponse.json()

        setRules(loadedRules)

        setHouseholdMembers(
          household.members,
        )
      } catch (err) {
        if (err instanceof Error) {
          setLoadError(err.message)
        } else {
          setLoadError(
            "Failed to load household information.",
          )
        }
      }
    }

    loadHouseholdData()
  }, [])

  async function handleParseReceipt() {
    if (!file) {
      setError(
        "Please select a receipt first.",
      )
      return
    }

    setIsParsing(true)
    setError(null)
    setResult(null)

    setSaveError(null)
    setSaveSuccess(null)

    const formData = new FormData()

    formData.append("file", file)

    try {
      const response = await fetch(
        "http://localhost:8000/receipts/parse?household_id=1",
        {
          method: "POST",
          body: formData,
        },
      )

      if (!response.ok) {
        throw new Error(
          "Failed to parse receipt.",
        )
      }

      const data: ParsedReceipt =
        await response.json()

      setResult(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Something went wrong.",
        )
      }
    } finally {
      setIsParsing(false)
    }
  }

  function handleRuleCreated(
    rule: SplitRule,
  ) {
    setRules((currentRules) => [
      ...currentRules,
      rule,
    ])
  }

  function getEffectiveSplit(
    item: ReceiptItem,
  ) {
    // Manual item override
    if (item.split_between !== undefined) {
      return item.split_between
    }

    // Otherwise use category rule
    const matchingRule = rules.find(
      (rule) =>
        rule.match_type === "category" &&
        rule.match_value === item.category,
    )

    if (!matchingRule) {
      return []
    }

    return matchingRule.members.map(
      (member) => member.member_id,
    )
  }

  function validateExpense(
    receipt: ParsedReceipt,
  ) {
    if (paidBy === "") {
      return "Please select who paid for the receipt."
    }

    if (!receipt.merchant.trim()) {
      return "Merchant cannot be empty."
    }

    const normalizedDate =
      normalizeDate(receipt.expense_date)

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        normalizedDate,
      )
    ) {
      return "Date must be in YYYY-MM-DD format."
    }

    if (
      !isValidMoney(receipt.subtotal) ||
      !isValidMoney(receipt.tax) ||
      !isValidMoney(receipt.total)
    ) {
      return "Subtotal, tax, and total must be valid numbers."
    }

    for (const item of receipt.items) {
      if (!item.description.trim()) {
        return "Every item needs a description."
      }

      if (!isValidMoney(item.amount)) {
        return `${item.description} has an invalid amount.`
      }

      if (!item.category) {
        return `${item.description} needs a category.`
      }

      if (item.category_source !== "saved") {
        return `${item.description} still needs its category confirmed.`
      }

      if (
        getEffectiveSplit(item).length === 0
      ) {
        return `${item.description} must be split between at least one household member.`
      }
    }

    return null
  }

  async function handleSaveExpense() {
    if (!result) {
      return
    }

    setSaveError(null)
    setSaveSuccess(null)

    const validationError =
      validateExpense(result)

    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)

    try {
      const items = result.items.map(
        (item) => {
          const itemPayload: {
            description: string
            amount: number
            category: string
            split_between?: number[]
            save_rule: boolean
          } = {
            description:
              item.description.trim(),

            amount:
              Number(item.amount),

            category:
              item.category!,

            save_rule: false,
          }

          // Only send split_between if
          // the user manually changed it.
          //
          // Otherwise the backend can
          // apply the saved category rule.
          if (
            item.split_between !==
            undefined
          ) {
            itemPayload.split_between =
              item.split_between
          }

          return itemPayload
        },
      )

      const payload = {
        household_id: 1,

        paid_by: paidBy,

        merchant:
          result.merchant.trim(),

        expense_date:
          normalizeDate(
            result.expense_date,
          ),

        subtotal:
          Number(result.subtotal),

        tax:
          Number(result.tax),

        total:
          Number(result.total),

        items,
      }

      const response = await fetch(
        "http://localhost:8000/expenses/",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload,
          ),
        },
      )

      if (!response.ok) {
        let message =
          "Failed to save expense."

        try {
          const errorData =
            await response.json()

          if (
            typeof errorData.detail ===
            "string"
          ) {
            message =
              errorData.detail
          } else if (
            errorData.detail
          ) {
            message =
              JSON.stringify(
                errorData.detail,
              )
          }
        } catch {
          // Use default message
        }

        throw new Error(message)
      }

      await response.json()

      setSaveSuccess(
        "Expense saved successfully.",
      )

      // Clear the reviewed receipt so
      // it cannot accidentally be saved twice.
      setResult(null)

      setFile(null)
      setPaidBy("")
    } catch (err) {
      if (err instanceof Error) {
        setSaveError(err.message)
      } else {
        setSaveError(
          "Failed to save expense.",
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <h2 className="text-3xl font-bold">
        Receipts
      </h2>

      <p className="mt-2 text-gray-500">
        Upload a receipt to scan and review.
      </p>

      {/* Upload card */}
      <div className="mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-6">

        <h3 className="text-lg font-semibold">
          Upload Receipt
        </h3>

        <input
          type="file"
          accept="image/*"
          className="mt-5 block w-full text-sm text-gray-600"
          onChange={(event) => {
            const selectedFile =
              event.target.files?.[0] ??
              null

            setFile(selectedFile)

            setSaveSuccess(null)
          }}
        />

        {file && (
          <p className="mt-3 text-sm text-gray-500">
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={
            handleParseReceipt
          }
          disabled={
            !file ||
            isParsing
          }
          className="mt-6 rounded-lg bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isParsing
            ? "Parsing..."
            : "Parse Receipt"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {loadError && (
          <p className="mt-4 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {saveSuccess && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
            ✓ {saveSuccess}
          </p>
        )}

      </div>

      {/* Receipt review */}
      {result && (
        <>
          <ReceiptReview
            receipt={result}
            onChange={setResult}
            rules={rules}
            householdMembers={
              householdMembers
            }
            onRuleCreated={
              handleRuleCreated
            }
          />

          {/* Save expense */}
          <div className="mt-6 max-w-4xl rounded-xl border border-gray-200 bg-white p-6">

            <h3 className="text-xl font-semibold">
              Save Expense
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Select who paid and save the reviewed receipt.
            </p>

            <div className="mt-5 max-w-sm">

              <label className="text-sm font-medium text-gray-700">
                Paid by
              </label>

              <select
                value={paidBy}
                onChange={(event) =>
                  setPaidBy(
                    event.target.value
                      ? Number(
                          event.target
                            .value,
                        )
                      : "",
                  )
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >

                <option value="">
                  Choose household member
                </option>

                {householdMembers.map(
                  (member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.name}
                    </option>
                  ),
                )}

              </select>

            </div>

            <div className="mt-6 max-w-sm space-y-2 border-t border-gray-200 pt-5">

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span>
                  ${result.subtotal}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Tax
                </span>

                <span>
                  ${result.tax}
                </span>
              </div>

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>

                <span>
                  ${result.total}
                </span>
              </div>

            </div>

            {saveError && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {saveError}
              </p>
            )}

            <button
              type="button"
              onClick={
                handleSaveExpense
              }
              disabled={isSaving}
              className="mt-6 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving
                ? "Saving..."
                : "Save Expense"}
            </button>

          </div>
        </>
      )}
    </>
  )
}

function normalizeDate(
  date: string,
) {
  return date
    .trim()
    .replaceAll("/", "-")
}

function isValidMoney(
  value: string,
) {
  const number =
    Number(value)

  return (
    Number.isFinite(number) &&
    number >= 0
  )
}

export default ReceiptsPage