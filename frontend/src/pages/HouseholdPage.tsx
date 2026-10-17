import {
  useEffect,
  useState,
} from "react"

import {
  useHousehold,
  type Household,
} from "../context/HouseholdContext"


function HouseholdPage() {
  const {
    selectedHousehold,
    selectedHouseholdId,
    setSelectedHouseholdId,
    isLoadingHouseholds,
    refreshHouseholds,
  } = useHousehold()


  // =====================================================
  // General messages
  // =====================================================

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)


  // =====================================================
  // Create household
  // =====================================================

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false)

  const [
    householdName,
    setHouseholdName,
  ] = useState("")

  const [
    memberNames,
    setMemberNames,
  ] = useState<string[]>([""])

  const [
    isCreating,
    setIsCreating,
  ] = useState(false)


  // =====================================================
  // Rename household
  // =====================================================

  const [
    isRenamingHousehold,
    setIsRenamingHousehold,
  ] = useState(false)

  const [
    householdRename,
    setHouseholdRename,
  ] = useState("")

  const [
    isSavingHouseholdName,
    setIsSavingHouseholdName,
  ] = useState(false)


  // =====================================================
  // Add member
  // =====================================================

  const [
    showAddMember,
    setShowAddMember,
  ] = useState(false)

  const [
    newMemberName,
    setNewMemberName,
  ] = useState("")

  const [
    isAddingMember,
    setIsAddingMember,
  ] = useState(false)


  // =====================================================
  // Edit member
  // =====================================================

  const [
    editingMemberId,
    setEditingMemberId,
  ] = useState<number | null>(null)

  const [
    editMemberName,
    setEditMemberName,
  ] = useState("")

  const [
    savingMemberId,
    setSavingMemberId,
  ] = useState<number | null>(null)


  // =====================================================
  // Remove member
  // =====================================================

  const [
    removingMemberId,
    setRemovingMemberId,
  ] = useState<number | null>(null)


  // =====================================================
  // Reset edit forms when household changes
  // =====================================================

  useEffect(() => {
    setIsRenamingHousehold(false)
    setHouseholdRename("")

    setShowAddMember(false)
    setNewMemberName("")

    setEditingMemberId(null)
    setEditMemberName("")

    setError(null)
    setSuccess(null)
  }, [selectedHouseholdId])


  // =====================================================
  // Create household
  // =====================================================

  function openCreateForm() {
    setHouseholdName("")
    setMemberNames([""])

    setError(null)
    setSuccess(null)

    setShowCreateForm(true)
  }


  function cancelCreate() {
    setShowCreateForm(false)

    setHouseholdName("")
    setMemberNames([""])

    setError(null)
  }


  function updateMemberName(
    index: number,
    value: string,
  ) {
    setMemberNames(
      (current) =>
        current.map(
          (name, memberIndex) =>
            memberIndex === index
              ? value
              : name,
        ),
    )
  }


  function addMemberField() {
    setMemberNames(
      (current) => [
        ...current,
        "",
      ],
    )
  }


  function removeMemberField(
    index: number,
  ) {
    setMemberNames(
      (current) =>
        current.filter(
          (_, memberIndex) =>
            memberIndex !== index,
        ),
    )
  }


  async function createHousehold() {
    const trimmedHouseholdName =
      householdName.trim()

    const cleanedMemberNames =
      memberNames
        .map(
          (name) =>
            name.trim(),
        )
        .filter(
          (name) =>
            name.length > 0,
        )

    if (!trimmedHouseholdName) {
      setError(
        "Enter a household name.",
      )

      return
    }

    if (
      cleanedMemberNames.length === 0
    ) {
      setError(
        "Add at least one household member.",
      )

      return
    }

    const normalizedNames =
      cleanedMemberNames.map(
        (name) =>
          name.toLowerCase(),
      )

    if (
      new Set(normalizedNames).size !==
      normalizedNames.length
    ) {
      setError(
        "Household members must have unique names.",
      )

      return
    }

    setIsCreating(true)

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        "http://localhost:8000/households/",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name:
              trimmedHouseholdName,

            members:
              cleanedMemberNames.map(
                (name) => ({
                  name,
                }),
              ),
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to create household.",
          ),
        )
      }

      const createdHousehold:
        Household =
          await response.json()

      await refreshHouseholds()

      setSelectedHouseholdId(
        createdHousehold.id,
      )

      setShowCreateForm(false)

      setHouseholdName("")
      setMemberNames([""])

      setSuccess(
        `${createdHousehold.name} created successfully.`,
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to create household.",
        )
      }

    } finally {
      setIsCreating(false)
    }
  }


  // =====================================================
  // Rename household
  // =====================================================

  function startRenamingHousehold() {
    if (!selectedHousehold) {
      return
    }

    setHouseholdRename(
      selectedHousehold.name,
    )

    setIsRenamingHousehold(true)

    setError(null)
    setSuccess(null)
  }


  function cancelRenameHousehold() {
    setIsRenamingHousehold(false)

    setHouseholdRename("")
  }


  async function saveHouseholdName() {
    if (!selectedHousehold) {
      return
    }

    const name =
      householdRename.trim()

    if (!name) {
      setError(
        "Household name cannot be empty.",
      )

      return
    }

    setIsSavingHouseholdName(true)

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHousehold.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to rename household.",
          ),
        )
      }

      await refreshHouseholds()

      setIsRenamingHousehold(false)

      setHouseholdRename("")

      setSuccess(
        "Household name updated.",
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to rename household.",
        )
      }

    } finally {
      setIsSavingHouseholdName(false)
    }
  }


  // =====================================================
  // Add household member
  // =====================================================

  function openAddMember() {
    setNewMemberName("")

    setShowAddMember(true)

    setError(null)
    setSuccess(null)
  }


  function cancelAddMember() {
    setShowAddMember(false)

    setNewMemberName("")
  }


  async function addMember() {
    if (!selectedHousehold) {
      return
    }

    const name =
      newMemberName.trim()

    if (!name) {
      setError(
        "Enter a member name.",
      )

      return
    }

    setIsAddingMember(true)

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHousehold.id}/members`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to add member.",
          ),
        )
      }

      await refreshHouseholds()

      setShowAddMember(false)

      setNewMemberName("")

      setSuccess(
        `${name} added to the household.`,
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to add member.",
        )
      }

    } finally {
      setIsAddingMember(false)
    }
  }


  // =====================================================
  // Rename household member
  // =====================================================

  function startEditingMember(
    memberId: number,
    currentName: string,
  ) {
    setEditingMemberId(
      memberId,
    )

    setEditMemberName(
      currentName,
    )

    setError(null)
    setSuccess(null)
  }


  function cancelEditingMember() {
    setEditingMemberId(null)

    setEditMemberName("")
  }


  async function saveMemberName(
    memberId: number,
  ) {
    if (!selectedHousehold) {
      return
    }

    const name =
      editMemberName.trim()

    if (!name) {
      setError(
        "Member name cannot be empty.",
      )

      return
    }

    setSavingMemberId(
      memberId,
    )

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHousehold.id}/members/${memberId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to rename member.",
          ),
        )
      }

      await refreshHouseholds()

      setEditingMemberId(null)

      setEditMemberName("")

      setSuccess(
        "Member name updated.",
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to rename member.",
        )
      }

    } finally {
      setSavingMemberId(null)
    }
  }


  // =====================================================
  // Remove household member
  // =====================================================

  async function removeMember(
    memberId: number,
    memberName: string,
  ) {
    if (!selectedHousehold) {
      return
    }

    const confirmed =
      window.confirm(
        `Remove "${memberName}" from "${selectedHousehold.name}"?`,
      )

    if (!confirmed) {
      return
    }

    setRemovingMemberId(
      memberId,
    )

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `http://localhost:8000/households/${selectedHousehold.id}/members/${memberId}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to remove member.",
          ),
        )
      }

      await refreshHouseholds()

      setSuccess(
        `${memberName} removed from the household.`,
      )

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          "Failed to remove member.",
        )
      }

    } finally {
      setRemovingMemberId(null)
    }
  }


  // =====================================================
  // Loading state
  // =====================================================

  if (isLoadingHouseholds) {
    return (
      <p className="text-gray-500">
        Loading households...
      </p>
    )
  }


  // =====================================================
  // Page
  // =====================================================

  return (
    <>
      {/* Page header */}
      <div className="flex max-w-4xl items-start justify-between gap-6">

        <div>
          <h2 className="text-3xl font-bold">
            {selectedHousehold
              ? selectedHousehold.name
              : "Household"}
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your household and
            its members.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          + New Household
        </button>

      </div>


      {/* Error message */}
      {error && (
        <div className="mt-6 max-w-4xl rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* Success message */}
      {success && (
        <div className="mt-6 max-w-4xl rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          ✓ {success}
        </div>
      )}


      {/* ================================================= */}
      {/* Create Household */}
      {/* ================================================= */}

      {showCreateForm && (
        <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6">

          <h3 className="text-xl font-semibold">
            Create Household
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Give the household a name
            and add its initial members.
          </p>


          <div className="mt-6">

            <label className="text-sm font-medium text-gray-700">
              Household name
            </label>

            <input
              type="text"
              value={householdName}
              onChange={(event) =>
                setHouseholdName(
                  event.target.value,
                )
              }
              placeholder="Example: Beach House"
              className="mt-1 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
            />

          </div>


          <div className="mt-6">

            <p className="text-sm font-medium text-gray-700">
              Members
            </p>

            <div className="mt-3 space-y-3">

              {memberNames.map(
                (
                  memberName,
                  index,
                ) => (
                  <div
                    key={index}
                    className="flex max-w-md items-center gap-3"
                  >

                    <input
                      type="text"
                      value={memberName}
                      onChange={(event) =>
                        updateMemberName(
                          index,
                          event.target.value,
                        )
                      }
                      placeholder={`Member ${index + 1}`}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                    />

                    {memberNames.length >
                      1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeMemberField(
                            index,
                          )
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}

                  </div>
                ),
              )}

            </div>


            <button
              type="button"
              onClick={addMemberField}
              className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              + Add another member
            </button>

          </div>


          <div className="mt-7 flex gap-3">

            <button
              type="button"
              onClick={createHousehold}
              disabled={isCreating}
              className="rounded-lg bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreating
                ? "Creating..."
                : "Create Household"}
            </button>

            <button
              type="button"
              onClick={cancelCreate}
              disabled={isCreating}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

          </div>

        </div>
      )}


      {/* ================================================= */}
      {/* Selected Household */}
      {/* ================================================= */}

      {selectedHousehold ? (
        <>
          {/* Household Details */}
          <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6">

            <div className="flex items-start justify-between gap-5">

              <div>
                <h3 className="text-xl font-semibold">
                  Household Details
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Change the household
                  name.
                </p>
              </div>


              {!isRenamingHousehold && (
                <button
                  type="button"
                  onClick={
                    startRenamingHousehold
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Rename
                </button>
              )}

            </div>


            {isRenamingHousehold ? (
              <div className="mt-5">

                <input
                  type="text"
                  value={householdRename}
                  onChange={(event) =>
                    setHouseholdRename(
                      event.target.value,
                    )
                  }
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
                />


                <div className="mt-3 flex gap-2">

                  <button
                    type="button"
                    onClick={
                      saveHouseholdName
                    }
                    disabled={
                      isSavingHouseholdName
                    }
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
                  >
                    {isSavingHouseholdName
                      ? "Saving..."
                      : "Save"}
                  </button>


                  <button
                    type="button"
                    onClick={
                      cancelRenameHousehold
                    }
                    disabled={
                      isSavingHouseholdName
                    }
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            ) : (
              <p className="mt-5 font-medium">
                {selectedHousehold.name}
              </p>
            )}

          </div>


          {/* ================================================= */}
          {/* Members */}
          {/* ================================================= */}

          <div className="mt-6 max-w-3xl">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-xl font-semibold">
                  Members
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    selectedHousehold
                      .members.length
                  }{" "}
                  {selectedHousehold
                    .members.length === 1
                    ? "member"
                    : "members"}
                </p>
              </div>


              <button
                type="button"
                onClick={openAddMember}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                + Add Member
              </button>

            </div>


            {/* Add Member form */}
            {showAddMember && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">

                <h4 className="font-semibold">
                  Add Member
                </h4>


                <input
                  type="text"
                  value={newMemberName}
                  onChange={(event) =>
                    setNewMemberName(
                      event.target.value,
                    )
                  }
                  placeholder="Member name"
                  className="mt-4 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
                />


                <div className="mt-4 flex gap-2">

                  <button
                    type="button"
                    onClick={addMember}
                    disabled={
                      isAddingMember
                    }
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
                  >
                    {isAddingMember
                      ? "Adding..."
                      : "Add Member"}
                  </button>


                  <button
                    type="button"
                    onClick={cancelAddMember}
                    disabled={
                      isAddingMember
                    }
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}


            {/* Existing members */}
            <div className="mt-4 space-y-4">

              {selectedHousehold.members.map(
                (member) => {
                  const isEditing =
                    editingMemberId ===
                    member.id

                  const isRemoving =
                    removingMemberId ===
                    member.id

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl border border-gray-200 bg-white p-5"
                    >

                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={
                              editMemberName
                            }
                            onChange={(event) =>
                              setEditMemberName(
                                event.target.value,
                              )
                            }
                            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
                          />


                          <div className="mt-3 flex gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                saveMemberName(
                                  member.id,
                                )
                              }
                              disabled={
                                savingMemberId ===
                                member.id
                              }
                              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:bg-gray-300"
                            >
                              {savingMemberId ===
                              member.id
                                ? "Saving..."
                                : "Save"}
                            </button>


                            <button
                              type="button"
                              onClick={
                                cancelEditingMember
                              }
                              disabled={
                                savingMemberId ===
                                member.id
                              }
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Cancel
                            </button>

                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-4">

                          <h4 className="font-semibold">
                            {member.name}
                          </h4>


                          <div className="flex gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                startEditingMember(
                                  member.id,
                                  member.name,
                                )
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                removeMember(
                                  member.id,
                                  member.name,
                                )
                              }
                              disabled={
                                isRemoving
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:text-gray-400"
                            >
                              {isRemoving
                                ? "Removing..."
                                : "Remove"}
                            </button>

                          </div>

                        </div>
                      )}

                    </div>
                  )
                },
              )}

            </div>

          </div>
        </>
      ) : (
        /* No household exists */
        <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6">

          <h3 className="text-lg font-semibold">
            No household selected
          </h3>

          <p className="mt-2 text-gray-500">
            Create your first household
            to start tracking expenses.
          </p>

          <button
            type="button"
            onClick={openCreateForm}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
          >
            Create Household
          </button>

        </div>
      )}

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
    // Use the default message.
  }

  return defaultMessage
}


export default HouseholdPage