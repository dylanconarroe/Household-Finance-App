import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type HouseholdMember = {
  id: number
  name: string
}

export type Household = {
  id: number
  name: string
  members: HouseholdMember[]
}

type HouseholdContextType = {
  households: Household[]
  selectedHousehold: Household | null
  selectedHouseholdId: number | null
  setSelectedHouseholdId: (id: number) => void
  isLoadingHouseholds: boolean
  refreshHouseholds: () => Promise<void>
}

const HouseholdContext =
  createContext<HouseholdContextType | undefined>(
    undefined,
  )

type HouseholdProviderProps = {
  children: ReactNode
}

export function HouseholdProvider({
  children,
}: HouseholdProviderProps) {
  const [households, setHouseholds] =
    useState<Household[]>([])

  const [
    selectedHouseholdId,
    setSelectedHouseholdId,
  ] = useState<number | null>(null)

  const [
    isLoadingHouseholds,
    setIsLoadingHouseholds,
  ] = useState(true)

  async function refreshHouseholds() {
    setIsLoadingHouseholds(true)

    try {
      const response = await fetch(
        "http://localhost:8000/households/",
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load households.",
        )
      }

      const data: Household[] =
        await response.json()

      setHouseholds(data)

      if (data.length === 0) {
        setSelectedHouseholdId(null)
        return
      }

      setSelectedHouseholdId(
        (currentId) => {
          const stillExists =
            data.some(
              (household) =>
                household.id === currentId,
            )

          if (
            currentId !== null &&
            stillExists
          ) {
            return currentId
          }

          return data[0].id
        },
      )
    } finally {
      setIsLoadingHouseholds(false)
    }
  }

  useEffect(() => {
    refreshHouseholds()
  }, [])

  const selectedHousehold =
    households.find(
      (household) =>
        household.id ===
        selectedHouseholdId,
    ) ?? null

  return (
    <HouseholdContext.Provider
      value={{
        households,
        selectedHousehold,
        selectedHouseholdId,
        setSelectedHouseholdId,
        isLoadingHouseholds,
        refreshHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const context =
    useContext(HouseholdContext)

  if (!context) {
    throw new Error(
      "useHousehold must be used inside HouseholdProvider",
    )
  }

  return context
}