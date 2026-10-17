import {
  useEffect,
  useState,
} from "react"

import {
  useHousehold,
} from "../context/HouseholdContext"


type BillTemplateMember = {
  member_id: number
  name: string
}

type BillTemplate = {
  id: number
  household_id: number
  name: string
  default_amount: string
  paid_by: number
  members: BillTemplateMember[]
}


function BillsPage() {
  const {
    selectedHousehold,
    selectedHouseholdId,
  } = useHousehold()

  const [templates, setTemplates] =
    useState<BillTemplate[]>([])

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState<number | null>(null)

  const [name, setName] =
    useState("")

  const [amount, setAmount] =
    useState("")

  const [date, setDate] =
    useState(getToday())

  const [paidBy, setPaidBy] =
    useState<number | "">("")

  const [memberIds, setMemberIds] =
    useState<number[]>([])

  const [isLoading, setIsLoading] =
    useState(false)

  const [isSavingBill, setIsSavingBill] =
    useState(false)

  const [
    isSavingTemplate,
    setIsSavingTemplate,
  ] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)


  useEffect(() => {
    resetForm()

    if (selectedHouseholdId !== null) {
      loadTemplates()
    }
  }, [selectedHouseholdId])


  async function loadTemplates() {
    if (selectedHouseholdId === null) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHouseholdId}/bill-templates/`,
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load saved bills.",
        )
      }

      const data: BillTemplate[] =
        await response.json()

      setTemplates(data)

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to load saved bills.",
        )
      }
    } finally {
      setIsLoading(false)
    }
  }


  function resetForm() {
    setSelectedTemplateId(null)

    setName("")
    setAmount("")
    setDate(getToday())
    setPaidBy("")

    if (selectedHousehold) {
      setMemberIds(
        selectedHousehold.members.map(
          (member) => member.id,
        ),
      )
    } else {
      setMemberIds([])
    }

    setError(null)
    setSuccess(null)
  }


  function useTemplate(
    template: BillTemplate,
  ) {
    setSelectedTemplateId(
      template.id,
    )

    setName(template.name)

    setAmount(
      template.default_amount,
    )

    setDate(getToday())

    setPaidBy(
      template.paid_by,
    )

    setMemberIds(
      template.members.map(
        (member) =>
          member.member_id,
      ),
    )

    setError(null)
    setSuccess(null)
  }


  function toggleMember(
    memberId: number,
  ) {
    setMemberIds(
      (current) =>
        current.includes(memberId)
          ? current.filter(
              (id) =>
                id !== memberId,
            )
          : [
              ...current,
              memberId,
            ],
    )
  }


  function validateForm() {
    if (!name.trim()) {
      return "Enter an expense name."
    }

    const numericAmount =
      Number(amount)

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      return "Enter a valid amount greater than zero."
    }

    if (!date) {
      return "Select a date."
    }

    if (paidBy === "") {
      return "Select who paid the bill."
    }

    if (memberIds.length === 0) {
      return "Select at least one person who shares the bill."
    }

    return null
  }


  async function saveBill() {
    if (
      selectedHouseholdId === null
    ) {
      return
    }

    const validationError =
      validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSavingBill(true)
    setError(null)
    setSuccess(null)

    const numericAmount =
      Number(amount)

    try {
      const response = await fetch(
        "http://localhost:8000/expenses/",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            household_id:
              selectedHouseholdId,

            paid_by:
              paidBy,

            merchant:
              name.trim(),

            expense_date:
              date,

            subtotal:
              numericAmount,

            tax: 0,

            total:
              numericAmount,

            items: [
              {
                description:
                  name.trim(),

                amount:
                  numericAmount,

                category:
                  "bill",

                split_between:
                  memberIds,

                save_rule:
                  false,
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to save bill.",
          ),
        )
      }

      await response.json()

      setSuccess(
        `${name.trim()} saved as an expense.`,
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to save bill.",
        )
      }

    } finally {
      setIsSavingBill(false)
    }
  }


  async function saveTemplate() {
    if (
      selectedHouseholdId === null
    ) {
      return
    }

    const validationError =
      validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSavingTemplate(true)
    setError(null)
    setSuccess(null)

    try {
      let response: Response

      /*
        If a saved template is loaded,
        update that template.

        Otherwise create a new one.
      */
      if (
        selectedTemplateId !== null
      ) {
        response = await fetch(
          `http://localhost:8000/households/${selectedHouseholdId}/bill-templates/${selectedTemplateId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                name.trim(),

              default_amount:
                Number(amount),

              paid_by:
                paidBy,

              member_ids:
                memberIds,
            }),
          },
        )

      } else {
        response = await fetch(
          `http://localhost:8000/households/${selectedHouseholdId}/bill-templates/`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                name.trim(),

              default_amount:
                Number(amount),

              paid_by:
                paidBy,

              member_ids:
                memberIds,
            }),
          },
        )
      }

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to save bill template.",
          ),
        )
      }

      const savedTemplate:
        BillTemplate =
          await response.json()

      setSelectedTemplateId(
        savedTemplate.id,
      )

      await loadTemplates()

      setSuccess(
        selectedTemplateId !== null
          ? "Saved bill template updated."
          : "Bill saved as a reusable template.",
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to save bill template.",
        )
      }

    } finally {
      setIsSavingTemplate(false)
    }
  }


  async function deleteTemplate(
    template: BillTemplate,
  ) {
    if (
      selectedHouseholdId === null
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Delete the saved "${template.name}" bill template?`,
      )

    if (!confirmed) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHouseholdId}/bill-templates/${template.id}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to delete bill template.",
          ),
        )
      }

      setTemplates(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              template.id,
          ),
      )

      if (
        selectedTemplateId ===
        template.id
      ) {
        resetForm()
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to delete bill template.",
        )
      }
    }
  }


  function getMemberName(
    memberId: number,
  ) {
    return (
      selectedHousehold?.members.find(
        (member) =>
          member.id === memberId,
      )?.name ??
      `Member ${memberId}`
    )
  }


  if (!selectedHousehold) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Bills
        </h2>

        <p className="mt-2 text-gray-500">
          Create or select a household
          before adding bills.
        </p>
      </>
    )
  }


  return (
    <>
      <div className="flex max-w-5xl items-center justify-between">

        <div>
          <h2 className="text-3xl font-bold">
            Bills
          </h2>

          <p className="mt-2 text-gray-500">
            Add bills and other
            non-receipt expenses for{" "}
            <span className="font-medium text-gray-700">
              {selectedHousehold.name}
            </span>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          + New Bill
        </button>

      </div>


      {/* Saved templates */}
      <div className="mt-8 max-w-5xl">

        <h3 className="text-xl font-semibold">
          Saved Bills
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Reuse common bills and change
          the amount whenever needed.
        </p>


        {isLoading ? (
          <p className="mt-4 text-gray-500">
            Loading saved bills...
          </p>
        ) : templates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-gray-500">
            No saved bill templates yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">

            {templates.map(
              (template) => (
                <div
                  key={template.id}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <h4 className="text-lg font-semibold">
                        {template.name}
                      </h4>

                      <p className="mt-1 text-xl font-bold">
                        {formatMoney(
                          template.default_amount,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteTemplate(
                          template,
                        )
                      }
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>

                  </div>

                  <p className="mt-4 text-sm text-gray-500">
                    Paid by{" "}
                    <span className="font-medium text-gray-700">
                      {getMemberName(
                        template.paid_by,
                      )}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Shared by{" "}
                    {template.members
                      .map(
                        (member) =>
                          member.name,
                      )
                      .join(", ")}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      useTemplate(
                        template,
                      )
                    }
                    className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Use Bill
                  </button>

                </div>
              ),
            )}

          </div>
        )}

      </div>


      {/* Bill form */}
      <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="text-xl font-semibold">
              {selectedTemplateId !== null
                ? "Use Saved Bill"
                : "Add Bill"}
            </h3>

            {selectedTemplateId !== null && (
              <p className="mt-1 text-sm text-gray-500">
                Change the amount or
                other details for this
                occurrence if needed.
              </p>
            )}
          </div>

          {selectedTemplateId !== null && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Saved template
            </span>
          )}

        </div>


        <div className="mt-6 grid gap-5 md:grid-cols-2">

          <div>
            <label className="text-sm font-medium text-gray-700">
              Expense name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Internet"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>


          <div>
            <label className="text-sm font-medium text-gray-700">
              Amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              placeholder="95.00"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>


          <div>
            <label className="text-sm font-medium text-gray-700">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>


          <div>
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

              {selectedHousehold.members.map(
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

        </div>


        <div className="mt-6">

          <p className="text-sm font-medium text-gray-700">
            Who shares this bill?
          </p>

          <div className="mt-3 flex flex-wrap gap-5">

            {selectedHousehold.members.map(
              (member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2"
                >

                  <input
                    type="checkbox"
                    checked={memberIds.includes(
                      member.id,
                    )}
                    onChange={() =>
                      toggleMember(
                        member.id,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span>
                    {member.name}
                  </span>

                </label>
              ),
            )}

          </div>

        </div>


        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
            ✓ {success}
          </div>
        )}


        <div className="mt-6 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={saveBill}
            disabled={isSavingBill}
            className="rounded-lg bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
          >
            {isSavingBill
              ? "Saving..."
              : "Save Bill Expense"}
          </button>


          <button
            type="button"
            onClick={saveTemplate}
            disabled={
              isSavingTemplate
            }
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
          >
            {isSavingTemplate
              ? "Saving..."
              : selectedTemplateId !==
                  null
                ? "Update Saved Template"
                : "Save as Template"}
          </button>

        </div>


        {selectedTemplateId !== null && (
          <p className="mt-3 text-xs text-gray-400">
            Saving the bill expense does
            not automatically change the
            saved template. Use "Update
            Saved Template" if you want
            the new amount or selections
            to become the defaults next
            time.
          </p>
        )}

      </div>
    </>
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


function getToday() {
  const date = new Date()

  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0")

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0")

  return `${year}-${month}-${day}`
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


export default BillsPage