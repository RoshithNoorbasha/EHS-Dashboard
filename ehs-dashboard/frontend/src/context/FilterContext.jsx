import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

const FilterContext = createContext(null)

const STORAGE_KEY = 'ehs_dashboard_global_filters'

export function FilterProvider({ children }) {
  const { isSiteIncharge, assignedPlantIds } = useAuth()

  // Retrieve saved filters or fallback
  const getSavedFilters = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return {
      selectedPlant: 'All',
      selectedPlot: 'All',
      selectedMonth: 'All',
      selectedYear: 2026,
    }
  }

  const initial = getSavedFilters()
  const [selectedPlant, setSelectedPlantState] = useState(initial.selectedPlant || 'All')
  const [selectedPlot, setSelectedPlotState] = useState(initial.selectedPlot || 'All')
  const [selectedMonth, setSelectedMonthState] = useState(initial.selectedMonth || 'All')
  const [selectedYear, setSelectedYearState] = useState(initial.selectedYear || 2026)

  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])
  const [loadingPlants, setLoadingPlants] = useState(true)

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedPlant,
          selectedPlot,
          selectedMonth,
          selectedYear,
        })
      )
    } catch {
      // ignore
    }
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  // Fetch plants list
  useEffect(() => {
    setLoadingPlants(true)
    api
      .get('/plants')
      .then((r) => {
        let plantList = r.data || []
        if (isSiteIncharge && assignedPlantIds.length > 0) {
          plantList = plantList.filter((p) => assignedPlantIds.includes(p.id))
          if (selectedPlant !== 'All' && !assignedPlantIds.includes(Number(selectedPlant))) {
            setSelectedPlantState(String(plantList[0]?.id || 'All'))
          }
        }
        setPlants(plantList)
      })
      .catch(() => {})
      .finally(() => setLoadingPlants(false))
  }, [isSiteIncharge, JSON.stringify(assignedPlantIds)])

  // Fetch plots list whenever selectedPlant changes
  useEffect(() => {
    if (selectedPlant && selectedPlant !== 'All') {
      api
        .get('/plots', { params: { plant_id: Number(selectedPlant) } })
        .then((r) => {
          setPlots(r.data || [])
        })
        .catch(() => setPlots([]))
    } else {
      setPlots([])
      if (selectedPlot !== 'All') {
        setSelectedPlotState('All')
      }
    }
  }, [selectedPlant])

  const setSelectedPlant = (plantId) => {
    setSelectedPlantState(plantId)
    setSelectedPlotState('All')
  }

  const setSelectedPlot = (plotId) => {
    setSelectedPlotState(plotId)
  }

  const setSelectedMonth = (m) => {
    setSelectedMonthState(m)
  }

  const setSelectedYear = (y) => {
    setSelectedYearState(Number(y))
  }

  const resetFilters = () => {
    setSelectedPlantState('All')
    setSelectedPlotState('All')
    setSelectedMonthState('All')
    setSelectedYearState(2026)
  }

  const isPlantSelected = selectedPlant && selectedPlant !== 'All'
  const isPlotSelected = isPlantSelected && selectedPlot && selectedPlot !== 'All'

  const currentPlantObj = plants.find((p) => String(p.id) === String(selectedPlant))
  const currentPlantName = currentPlantObj?.name || (isPlantSelected ? 'Selected Plant' : 'Cluster Overview')

  const currentPlotObj = plots.find((pl) => String(pl.id) === String(selectedPlot))
  const currentPlotName = currentPlotObj?.name || (isPlotSelected ? 'Selected Plot' : 'All Plots')

  // Formatted display title for the selected scope
  let filterTitle = 'Cluster EHS Performance Dashboard'
  if (isPlantSelected && !isPlotSelected) {
    filterTitle = `${currentPlantName} EHS Performance Dashboard`
  } else if (isPlantSelected && isPlotSelected) {
    filterTitle = `${currentPlantName} — ${currentPlotName} EHS Performance Dashboard`
  }

  const filterSubtitle =
    selectedMonth === 'All' ? `YTD ${selectedYear}` : `${selectedMonth} ${selectedYear}`

  return (
    <FilterContext.Provider
      value={{
        selectedPlant,
        setSelectedPlant,
        selectedPlot,
        setSelectedPlot,
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        plants,
        plots,
        loadingPlants,
        isPlantSelected,
        isPlotSelected,
        currentPlantName,
        currentPlotName,
        currentPlantObj,
        currentPlotObj,
        filterTitle,
        filterSubtitle,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) {
    throw new Error('useFilter must be used within a FilterProvider')
  }
  return ctx
}
