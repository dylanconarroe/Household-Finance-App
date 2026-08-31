import { useState } from "react"

export type ReceiptItem = {
  product_code: string | null
  description: string
  original_amount: string
  discount: string
  amount: string
  category: string | null

  category_source:
    | "saved"
    | "ai"
    | "unknown"

  // If undefined, use the category rule.
  // If present, this is a manual override.
  split_between?: number[]
}

export type ParsedReceipt = {
  merchant: string
  expense_date: string
  subtotal: string
  tax: string
  total: string
  items: ReceiptItem[]
  extracted_subtotal: string
  subtotal_matches: boolean
  total_matches: boolean
}

export type RuleMember = {
  member_id: number
  name: string
}

export type SplitRule = {
  id: number
  household_id: number
  name: string
  match_type: string
  match_value: string
  split_type: string
  members: RuleMember[]
}

export type HouseholdMember = {
  id: number
  name: string
}

type ReceiptReviewProps = {
  householdId: number
  receipt: ParsedReceipt
  onChange: (receipt: ParsedReceipt) => void
  rules: SplitRule[]
  householdMembers: HouseholdMember[]
  onRuleCreated: (rule: SplitRule) => void
}

function ReceiptReview({
  householdId,
  receipt,
  onChange,
  rules,
  householdMembers,
  onRuleCreated,
}: ReceiptReviewProps) {

  const [
    confirmingIndex,
    setConfirmingIndex,
  ] = useState<number | null>(null)

  const [
    confirmationError,
    setConfirmationError,
  ] = useState<string | null>(null)

  const [
    creatingCategoryFor,
    setCreatingCategoryFor,
  ] = useState<number | null>(null)

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("")

  const [
    newCategoryMemberIds,
    setNewCategoryMemberIds,
  ] = useState<number[]>([])

  const [
    isCreatingCategory,
    setIsCreatingCategory,
  ] = useState(false)

  const [
    createCategoryError,
    setCreateCategoryError,
  ] = useState<string | null>(null)

  const categories = [
    ...new Set(
      rules
        .filter(
          (rule) =>
            rule.match_type === "category",
        )
        .map(
          (rule) =>
            rule.match_value,
        ),
    ),
  ]

  function updateReceiptField(
    field:
      | "merchant"
      | "expense_date"
      | "subtotal"
      | "tax"
      | "total",

    value: string,
  ) {
    onChange({
      ...receipt,
      [field]: value,
    })
  }

  function updateItem(
    index: number,

    field:
      | "description"
      | "amount",

    value: string,
  ) {
    const updatedItems =
      receipt.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
      )

    onChange({
      ...receipt,
      items: updatedItems,
    })
  }

  function updateItemCategory(
    index: number,
    category: string,
  ) {
    const updatedItems =
      receipt.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,

                category:
                  category === ""
                    ? null
                    : category,

                // User manually changed it,
                // so it now needs confirmation.
                category_source:
                  "unknown" as const,

                // Let the new category's
                // rule determine the split.
                split_between:
                  undefined,
              }
            : item,
      )

    onChange({
      ...receipt,
      items: updatedItems,
    })
  }

  function getMatchingRule(
    item: ReceiptItem,
  ) {
    if (!item.category) {
      return undefined
    }

    return rules.find(
      (rule) =>
        rule.match_type ===
          "category" &&
        rule.match_value ===
          item.category,
    )
  }

  function getSelectedMemberIds(
    item: ReceiptItem,
  ) {
    // Manual override
    if (
      item.split_between !==
      undefined
    ) {
      return item.split_between
    }

    // Otherwise use saved rule
    const rule =
      getMatchingRule(item)

    if (!rule) {
      return []
    }

    return rule.members.map(
      (member) =>
        member.member_id,
    )
  }

  function toggleSplitMember(
    index: number,
    memberId: number,
  ) {
    const item =
      receipt.items[index]

    const currentMembers =
      getSelectedMemberIds(item)

    const updatedMembers =
      currentMembers.includes(
        memberId,
      )
        ? currentMembers.filter(
            (id) =>
              id !== memberId,
          )
        : [
            ...currentMembers,
            memberId,
          ]

    const updatedItems =
      receipt.items.map(
        (
          currentItem,
          itemIndex,
        ) =>
          itemIndex === index
            ? {
                ...currentItem,

                split_between:
                  updatedMembers,
              }
            : currentItem,
      )

    onChange({
      ...receipt,
      items: updatedItems,
    })
  }

  function resetSplitToRule(
    index: number,
  ) {
    const updatedItems =
      receipt.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                split_between:
                  undefined,
              }
            : item,
      )

    onChange({
      ...receipt,
      items: updatedItems,
    })
  }

  async function confirmCategory(
    index: number,
  ) {
    const item =
      receipt.items[index]

    if (!item.category) {
      setConfirmationError(
        "Please select a category first.",
      )
      return
    }

    setConfirmingIndex(index)
    setConfirmationError(null)

    try {
      const response =
        await fetch(
          "http://localhost:8000/receipts/category-mappings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              household_id: householdId,
              merchant:
                receipt.merchant,

              description:
                item.description,

              product_code:
                item.product_code,

              category:
                item.category,
            }),
          },
        )

      if (!response.ok) {
        let message =
          "Failed to confirm category."

        try {
          const errorData =
            await response.json()

          if (
            typeof errorData.detail ===
            "string"
          ) {
            message =
              errorData.detail
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message)
      }

      const updatedItems =
        receipt.items.map(
          (
            currentItem,
            itemIndex,
          ) =>
            itemIndex === index
              ? {
                  ...currentItem,

                  category_source:
                    "saved" as const,
                }
              : currentItem,
        )

      onChange({
        ...receipt,
        items: updatedItems,
      })

    } catch (err) {
      if (
        err instanceof Error
      ) {
        setConfirmationError(
          err.message,
        )
      } else {
        setConfirmationError(
          "Failed to confirm category.",
        )
      }

    } finally {
      setConfirmingIndex(null)
    }
  }

  function startCreatingCategory(
    index: number,
  ) {
    setCreatingCategoryFor(
      index,
    )

    setNewCategoryName("")

    // Start with everyone selected.
    setNewCategoryMemberIds(
      householdMembers.map(
        (member) => member.id,
      ),
    )

    setCreateCategoryError(
      null,
    )
  }

  function toggleNewCategoryMember(
    memberId: number,
  ) {
    setNewCategoryMemberIds(
      (current) =>
        current.includes(
          memberId,
        )
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

  function cancelNewCategory() {
    setCreatingCategoryFor(null)

    setNewCategoryName("")

    setNewCategoryMemberIds([])

    setCreateCategoryError(null)
  }

  async function createNewCategory(
    index: number,
  ) {
    const trimmedName =
      newCategoryName.trim()

    const matchValue =
      normalizeCategory(
        trimmedName,
      )

    if (!trimmedName) {
      setCreateCategoryError(
        "Enter a category name.",
      )
      return
    }

    if (
      newCategoryMemberIds.length ===
      0
    ) {
      setCreateCategoryError(
        "Select at least one household member.",
      )
      return
    }

    const alreadyExists =
      rules.some(
        (rule) =>
          rule.match_type ===
            "category" &&
          rule.match_value ===
            matchValue,
      )

    if (alreadyExists) {
      setCreateCategoryError(
        "That category already exists.",
      )
      return
    }

    setIsCreatingCategory(true)
    setCreateCategoryError(null)

    try {
      const response =
        await fetch(
          `http://localhost:8000/households/${householdId}/rules/`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: trimmedName,

              match_type:
                "category",

              match_value:
                matchValue,

              split_type:
                "equal",

              member_ids:
                newCategoryMemberIds,
            }),
          },
        )

      if (!response.ok) {
        let message =
          "Failed to create category."

        try {
          const errorData =
            await response.json()

          if (
            typeof errorData.detail ===
            "string"
          ) {
            message =
              errorData.detail
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message)
      }

      const createdRule:
        SplitRule =
          await response.json()

      // Add it immediately to
      // the available rules.
      onRuleCreated(
        createdRule,
      )

      // Select the new category
      // for this receipt item.
      const updatedItems =
        receipt.items.map(
          (
            item,
            itemIndex,
          ) =>
            itemIndex === index
              ? {
                  ...item,

                  category:
                    matchValue,

                  category_source:
                    "unknown" as const,

                  split_between:
                    undefined,
                }
              : item,
        )

      onChange({
        ...receipt,
        items: updatedItems,
      })

      cancelNewCategory()

    } catch (err) {
      if (
        err instanceof Error
      ) {
        setCreateCategoryError(
          err.message,
        )
      } else {
        setCreateCategoryError(
          "Failed to create category.",
        )
      }

    } finally {
      setIsCreatingCategory(
        false,
      )
    }
  }

  return (
    <div className="mt-8 max-w-4xl">

      {/* Receipt information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">

        <h3 className="text-2xl font-bold">
          Receipt Review
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm text-gray-500">
              Merchant
            </label>

            <input
              type="text"
              value={
                receipt.merchant
              }
              onChange={(event) =>
                updateReceiptField(
                  "merchant",
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Date
            </label>

            <input
              type="text"
              value={
                receipt.expense_date
              }
              onChange={(event) =>
                updateReceiptField(
                  "expense_date",
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Subtotal
            </label>

            <input
              type="text"
              value={
                receipt.subtotal
              }
              onChange={(event) =>
                updateReceiptField(
                  "subtotal",
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Tax
            </label>

            <input
              type="text"
              value={receipt.tax}
              onChange={(event) =>
                updateReceiptField(
                  "tax",
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Total
            </label>

            <input
              type="text"
              value={
                receipt.total
              }
              onChange={(event) =>
                updateReceiptField(
                  "total",
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

        </div>
      </div>

      {/* Items */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">

        <h3 className="text-xl font-semibold">
          Items
        </h3>

        {confirmationError && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {confirmationError}
          </p>
        )}

        <div className="mt-4 divide-y divide-gray-200">

          {receipt.items.map(
            (item, index) => {

              const matchingRule =
                getMatchingRule(
                  item,
                )

              const selectedMemberIds =
                getSelectedMemberIds(
                  item,
                )

              return (
                <div
                  key={`${item.product_code ?? "item"}-${index}`}
                  className="py-6"
                >

                  {/* Item information */}
                  <div className="flex items-start justify-between gap-6">

                    <div className="flex-1">

                      <input
                        type="text"
                        value={
                          item.description
                        }
                        onChange={(
                          event,
                        ) =>
                          updateItem(
                            index,
                            "description",
                            event
                              .target
                              .value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-medium"
                      />

                      {item.product_code && (
                        <p className="mt-1 text-sm text-gray-400">
                          Product code:{" "}
                          {
                            item.product_code
                          }
                        </p>
                      )}

                      {Number(
                        item.discount,
                      ) > 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                          Original $
                          {
                            item.original_amount
                          }{" "}
                          − $
                          {
                            item.discount
                          }{" "}
                          discount
                        </p>
                      )}

                    </div>

                    <div>
                      <label className="text-xs text-gray-400">
                        Amount
                      </label>

                      <input
                        type="text"
                        value={
                          item.amount
                        }
                        onChange={(
                          event,
                        ) =>
                          updateItem(
                            index,
                            "amount",
                            event
                              .target
                              .value,
                          )
                        }
                        className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-2 text-right"
                      />
                    </div>

                  </div>

                  {/* Category */}
                  <div className="mt-4 flex flex-wrap items-end gap-3">

                    <div className="w-64">

                      <label className="text-sm text-gray-500">
                        Category
                      </label>

                      <select
                        value={
                          item.category ??
                          ""
                        }
                        disabled={
                          item.category_source ===
                          "saved"
                        }
                        onChange={(
                          event,
                        ) => {
                          const value =
                            event
                              .target
                              .value

                          if (
                            value ===
                            "__create_new__"
                          ) {
                            startCreatingCategory(
                              index,
                            )

                            return
                          }

                          updateItemCategory(
                            index,
                            value,
                          )
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                      >

                        <option value="">
                          Choose category
                        </option>

                        {categories.map(
                          (
                            category,
                          ) => (
                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {formatCategory(
                                category,
                              )}
                            </option>
                          ),
                        )}

                        <option
                          disabled
                          value="__divider__"
                        >
                          ─────────────
                        </option>

                        <option value="__create_new__">
                          + Create new category
                        </option>

                      </select>

                    </div>

                    <CategorySourceBadge
                      source={
                        item.category_source
                      }
                      hasCategory={
                        item.category !==
                        null
                      }
                    />

                    {item.category_source !==
                      "saved" && (
                      <button
                        onClick={() =>
                          confirmCategory(
                            index,
                          )
                        }
                        disabled={
                          !item.category ||
                          confirmingIndex ===
                            index
                        }
                        className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {confirmingIndex ===
                        index
                          ? "Saving..."
                          : "Confirm Category"}
                      </button>
                    )}

                  </div>

                  {/* Create new category */}
                  {creatingCategoryFor ===
                    index && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5">

                      <h4 className="font-semibold">
                        Create New Category
                      </h4>

                      <div className="mt-4">

                        <label className="text-sm text-gray-600">
                          Category name
                        </label>

                        <input
                          type="text"
                          value={
                            newCategoryName
                          }
                          onChange={(
                            event,
                          ) =>
                            setNewCategoryName(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Example: Cat Supplies"
                          className="mt-1 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2"
                        />

                      </div>

                      <div className="mt-4">

                        <p className="text-sm font-medium text-gray-700">
                          Who normally
                          splits this
                          category?
                        </p>

                        <div className="mt-3 flex flex-wrap gap-5">

                          {householdMembers.map(
                            (
                              member,
                            ) => (
                              <label
                                key={
                                  member.id
                                }
                                className="flex cursor-pointer items-center gap-2"
                              >

                                <input
                                  type="checkbox"
                                  checked={newCategoryMemberIds.includes(
                                    member.id,
                                  )}
                                  onChange={() =>
                                    toggleNewCategoryMember(
                                      member.id,
                                    )
                                  }
                                  className="h-4 w-4"
                                />

                                <span className="text-sm">
                                  {
                                    member.name
                                  }
                                </span>

                              </label>
                            ),
                          )}

                        </div>
                      </div>

                      {createCategoryError && (
                        <p className="mt-3 text-sm text-red-600">
                          {
                            createCategoryError
                          }
                        </p>
                      )}

                      <div className="mt-5 flex gap-3">

                        <button
                          type="button"
                          onClick={() =>
                            createNewCategory(
                              index,
                            )
                          }
                          disabled={
                            isCreatingCategory
                          }
                          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
                        >
                          {isCreatingCategory
                            ? "Creating..."
                            : "Create Category"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelNewCategory
                          }
                          disabled={
                            isCreatingCategory
                          }
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </button>

                      </div>

                    </div>
                  )}

                  {/* Split selection */}
                  {item.category ? (
                    <div className="mt-5">

                      <div className="flex items-center gap-3">

                        <p className="text-sm font-medium text-gray-700">
                          Split between
                        </p>

                        {item.split_between !==
                          undefined && (
                          <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                            Custom split
                          </span>
                        )}

                        {item.split_between !== undefined && (
                            <p className="mt-2 text-xs text-purple-600">
                                This custom split will be used when the expense is saved.
                            </p>
                            )}

                      </div>

                      <div className="mt-3 flex flex-wrap gap-5">

                        {householdMembers.map(
                          (
                            member,
                          ) => (
                            <label
                              key={
                                member.id
                              }
                              className="flex cursor-pointer items-center gap-2"
                            >

                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(
                                  member.id,
                                )}
                                onChange={() =>
                                  toggleSplitMember(
                                    index,
                                    member.id,
                                  )
                                }
                                className="h-4 w-4"
                              />

                              <span className="text-sm">
                                {
                                  member.name
                                }
                              </span>

                            </label>
                          ),
                        )}

                      </div>

                      {matchingRule &&
                        item.split_between ===
                          undefined && (
                          <p className="mt-2 text-xs text-gray-400">
                            Using rule:{" "}
                            {
                              matchingRule.name
                            }
                          </p>
                        )}

                      {item.split_between !==
                        undefined &&
                        matchingRule && (
                        <button
                          type="button"
                          onClick={() =>
                            resetSplitToRule(
                              index,
                            )
                          }
                          className="mt-2 text-xs font-medium text-gray-500 underline hover:text-gray-900"
                        >
                          Reset to
                          category rule
                        </button>
                      )}

                      {selectedMemberIds.length ===
                        0 && (
                        <p className="mt-2 text-sm text-red-600">
                          Select at least
                          one household
                          member.
                        </p>
                      )}

                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-400">
                      Choose a category
                      to load its split
                      rule.
                    </p>
                  )}

                </div>
              )
            },
          )}

        </div>
      </div>

      {/* Validation */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">

        <h3 className="text-lg font-semibold">
          Receipt Validation
        </h3>

        <div className="mt-4 space-y-2">

          <p>
            Subtotal check:{" "}
            <span
              className={
                receipt.subtotal_matches
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {receipt.subtotal_matches
                ? "Passed"
                : "Failed"}
            </span>
          </p>

          <p>
            Total check:{" "}
            <span
              className={
                receipt.total_matches
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {receipt.total_matches
                ? "Passed"
                : "Failed"}
            </span>
          </p>

        </div>
      </div>

    </div>
  )
}

function CategorySourceBadge({
  source,
  hasCategory,
}: {
  source:
    ReceiptItem["category_source"]

  hasCategory: boolean
}) {
  const styles = {
    saved:
      "bg-green-100 text-green-700",

    ai:
      "bg-blue-100 text-blue-700",

    unknown:
      "bg-yellow-100 text-yellow-700",
  }

  let label = ""

  if (source === "saved") {
    label = "Saved"
  }

  if (source === "ai") {
    label = "AI suggestion"
  }

  if (source === "unknown") {
    label = hasCategory
      ? "Needs confirmation"
      : "Needs category"
  }

  return (
    <span
      className={`mb-1 rounded-full px-2 py-1 text-xs font-medium ${styles[source]}`}
    >
      {label}
    </span>
  )
}

function normalizeCategory(
  category: string,
) {
  return category
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function formatCategory(
  category: string,
) {
  return category
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ")
}

export default ReceiptReview