#!/bin/bash
sed -i 's/<FiltersDrawer \/>/{state.showFiltersDrawer \&\& <FiltersDrawer onClose={() => state.setShowFiltersDrawer(false)} \/>}/g' src/App.tsx
