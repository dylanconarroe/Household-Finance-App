import { useEffect, useState } from "react"

type HouseholdMember = {
  id: number
  name: string
}

type RuleMember = {
  member_id: number
  name: string
}

type SplitRule = {
  id: number
  household_id: number
  name: string
  match_type: string
  match_value: string
  split_type: string
  members: RuleMember[]
}

function SplitRulesPage() {
  const [rules, setRules] =
    useState<SplitRule[]>([])

  const [members, setMembers] =
    useState<HouseholdMember[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [editingRuleId, setEditingRuleId] =
    useState<number | null>(null)

  const [editName, setEditName] =
    useState("")

  const [editMemberIds, setEditMemberIds] =
    useState<number[]>([])

  const [isSaving, setIsSaving] =
    useState(false)

  const [isCreating, setIsCreating] =
    useState(false)

  const [showCreateForm, setShowCreateForm] =
    useState(false)

  const [newCategoryName, setNewCategoryName] =
    useState("")

  const [
    newCategoryMemberIds,
    setNewCategoryMemberIds,
  ] = useState<number[]>([])

  async function loadData() {
    setIsLoading(true)
    setError(null)

    try {
      const [
        rulesResponse,
        householdResponse,
      ] = await Promise.all([
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
      setMembers(household.members)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to load split rules.",
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function startEditing(
    rule: SplitRule,
  ) {
    setEditingRuleId(rule.id)

    setEditName(rule.name)

    setEditMemberIds(
      rule.members.map(
        (member) =>
          member.member_id,
      ),
    )

    setError(null)
  }

  function cancelEditing() {
    setEditingRuleId(null)
    setEditName("")
    setEditMemberIds([])
  }

  function toggleEditMember(
    memberId: number,
  ) {
    setEditMemberIds(
      (current) =>
        current.includes(memberId)
          ? current.filter(
              (id) => id !== memberId,
            )
          : [
              ...current,
              memberId,
            ],
    )
  }

  async function saveRule(
    ruleId: number,
  ) {
    if (!editName.trim()) {
      setError(
        "Rule name cannot be empty.",
      )
      return
    }

    if (editMemberIds.length === 0) {
      setError(
        "A rule must include at least one household member.",
      )
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/1/rules/${ruleId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: editName.trim(),
            member_ids:
              editMemberIds,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to update rule.",
          ),
        )
      }

      const updatedRule: SplitRule =
        await response.json()

      setRules(
        (currentRules) =>
          currentRules.map(
            (rule) =>
              rule.id === ruleId
                ? updatedRule
                : rule,
          ),
      )

      cancelEditing()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to update rule.",
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteRule(
    rule: SplitRule,
  ) {
    const confirmed =
      window.confirm(
        `Delete the "${rule.name}" split rule?`,
      )

    if (!confirmed) {
      return
    }

    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/1/rules/${rule.id}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to delete rule.",
          ),
        )
      }

      setRules(
        (currentRules) =>
          currentRules.filter(
            (currentRule) =>
              currentRule.id !==
              rule.id,
          ),
      )

      if (
        editingRuleId === rule.id
      ) {
        cancelEditing()
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to delete rule.",
        )
      }
    }
  }

  function openCreateForm() {
    setShowCreateForm(true)

    setNewCategoryName("")

    // Default new categories
    // to being shared by everyone.
    setNewCategoryMemberIds(
      members.map(
        (member) => member.id,
      ),
    )

    setError(null)
  }

  function cancelCreate() {
    setShowCreateForm(false)

    setNewCategoryName("")

    setNewCategoryMemberIds([])
  }

  function toggleNewCategoryMember(
    memberId: number,
  ) {
    setNewCategoryMemberIds(
      (current) =>
        current.includes(memberId)
          ? current.filter(
              (id) => id !== memberId,
            )
          : [
              ...current,
              memberId,
            ],
    )
  }

  async function createCategory() {
    const trimmedName =
      newCategoryName.trim()

    const matchValue =
      normalizeCategory(
        trimmedName,
      )

    if (!trimmedName) {
      setError(
        "Enter a category name.",
      )
      return
    }

    if (
      newCategoryMemberIds.length ===
      0
    ) {
      setError(
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
      setError(
        "That category already exists.",
      )
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch(
        "http://localhost:8000/households/1/rules/",
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
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to create category.",
          ),
        )
      }

      const createdRule: SplitRule =
        await response.json()

      setRules(
        (currentRules) => [
          ...currentRules,
          createdRule,
        ],
      )

      cancelCreate()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to create category.",
        )
      }
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <h2 className="text-3xl font-bold">
          Split Rules
        </h2>

        <p className="mt-4 text-gray-500">
          Loading rules...
        </p>
      </>
    )
  }

  return (
    <>
      <div className="flex max-w-4xl items-center justify-between">

        <div>
          <h2 className="text-3xl font-bold">
            Split Rules
          </h2>

          <p className="mt-2 text-gray-500">
            Manage categories and who normally shares them.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          + New Category
        </button>

      </div>

      {error && (
        <div className="mt-6 max-w-4xl rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create category */}
      {showCreateForm && (
        <div className="mt-6 max-w-4xl rounded-xl border border-gray-200 bg-white p-6">

          <h3 className="text-xl font-semibold">
            Create Category
          </h3>

          <div className="mt-5 max-w-md">

            <label className="text-sm font-medium text-gray-700">
              Category name
            </label>

            <input
              type="text"
              value={newCategoryName}
              onChange={(event) =>
                setNewCategoryName(
                  event.target.value,
                )
              }
              placeholder="Example: Cleaning Supplies"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />

          </div>

          <div className="mt-5">

            <p className="text-sm font-medium text-gray-700">
              Who normally shares this category?
            </p>

            <div className="mt-3 flex flex-wrap gap-5">

              {members.map(
                (member) => (
                  <label
                    key={member.id}
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

                    <span>
                      {member.name}
                    </span>

                  </label>
                ),
              )}

            </div>

          </div>

          <div className="mt-6 flex gap-3">

            <button
              type="button"
              onClick={createCategory}
              disabled={isCreating}
              className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
            >
              {isCreating
                ? "Creating..."
                : "Create Category"}
            </button>

            <button
              type="button"
              onClick={cancelCreate}
              disabled={isCreating}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      {/* Existing rules */}
      <div className="mt-8 max-w-4xl space-y-4">

        {rules.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No split rules yet.
          </div>
        )}

        {rules.map(
          (rule) => {
            const isEditing =
              editingRuleId === rule.id

            return (
              <div
                key={rule.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >

                {isEditing ? (
                  <>
                    <div className="max-w-md">

                      <label className="text-sm font-medium text-gray-700">
                        Rule name
                      </label>

                      <input
                        type="text"
                        value={editName}
                        onChange={(event) =>
                          setEditName(
                            event.target.value,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                      />

                    </div>

                    <div className="mt-5">

                      <p className="text-sm font-medium text-gray-700">
                        Split between
                      </p>

                      <div className="mt-3 flex flex-wrap gap-5">

                        {members.map(
                          (member) => (
                            <label
                              key={member.id}
                              className="flex cursor-pointer items-center gap-2"
                            >

                              <input
                                type="checkbox"
                                checked={editMemberIds.includes(
                                  member.id,
                                )}
                                onChange={() =>
                                  toggleEditMember(
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

                    <div className="mt-6 flex gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          saveRule(
                            rule.id,
                          )
                        }
                        disabled={isSaving}
                        className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
                      >
                        {isSaving
                          ? "Saving..."
                          : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>

                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-6">

                      <div>

                        <h3 className="text-xl font-semibold">
                          {rule.name}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2">

                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            Category:{" "}
                            {formatCategory(
                              rule.match_value,
                            )}
                          </span>

                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            Equal split
                          </span>

                        </div>

                      </div>

                      <div className="flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            startEditing(
                              rule,
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteRule(
                              rule,
                            )
                          }
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                    <div className="mt-5">

                      <p className="text-sm font-medium text-gray-500">
                        Split between
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3">

                        {members.map(
                          (member) => {
                            const included =
                              rule.members.some(
                                (ruleMember) =>
                                  ruleMember.member_id ===
                                  member.id,
                              )

                            return (
                              <span
                                key={member.id}
                                className={`rounded-full px-3 py-1 text-sm ${
                                  included
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {included
                                  ? "✓ "
                                  : ""}
                                {member.name}
                              </span>
                            )
                          },
                        )}

                      </div>

                    </div>
                  </>
                )}

              </div>
            )
          },
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
    // Use default below.
  }

  return defaultMessage
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

export default SplitRulesPage