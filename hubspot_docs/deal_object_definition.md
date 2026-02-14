## Documentation Index
> Fetch the complete documentation index at: https://developers.hubspot.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

---
id: 46b8b1a0-c261-48bd-88c3-68a22236b630
---

# Deal object definition

> Information about the Deal object, including identifiers, feature support, and default properties.

export const Property = ({name, label, type, fieldType, description, required = false, searchable = false, primaryDisplayProperty = false, secondaryDisplayProperty = false, options = null, expanded = true, json = null}) => {
  return null;
};

export const PropertyDefinitions = ({searchable = true, placeholder = "Search properties", objectPluralName = "Records", objectSingularName = "record", border = true, compact = true, lazyLoad = true, children}) => {
  const \[isVisible, setIsVisible\] = useState(!lazyLoad);
  const \[isInitialized, setIsInitialized\] = useState(!lazyLoad);
  const \[showSkeleton, setShowSkeleton\] = useState(lazyLoad);
  const \[forceInitialize, setForceInitialize\] = useState(false);
  const loadStartTime = useRef(Date.now());
  const \[searchTerm, setSearchTerm\] = useState('');
  const \[debouncedSearchTerm, setDebouncedSearchTerm\] = useState('');
  const \[openStates, setOpenStates\] = useState({});
  const \[showBackToTop, setShowBackToTop\] = useState(false);
  const \[selectedType, setSelectedType\] = useState('all');
  const \[selectedFieldType, setSelectedFieldType\] = useState('all');
  const \[selectedAttribute, setSelectedAttribute\] = useState('all');
  const \[typeDropdownOpen, setTypeDropdownOpen\] = useState(false);
  const \[fieldTypeDropdownOpen, setFieldTypeDropdownOpen\] = useState(false);
  const \[attributeDropdownOpen, setAttributeDropdownOpen\] = useState(false);
  const \[allExpanded, setAllExpanded\] = useState(true);
  const \[selectedProperty, setSelectedProperty\] = useState(null);
  const \[hoveredProperty, setHoveredProperty\] = useState(null);
  const \[visibleJson, setVisibleJson\] = useState({});
  const \[copiedLinks, setCopiedLinks\] = useState({});
  const \[copiedCodes, setCopiedCodes\] = useState({});
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const fieldTypeConfigs = {
    text: {
      label: 'Single-line text',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.41938 4.6025H3.66187L5.6525 9.87437H4.54563L4.16937 8.82875H1.91625L1.54 9.87437H0.4375L2.41938 4.6025ZM3.85 7.92313L3.045 5.67L2.24 7.92313H3.85438H3.85ZM7.1225 9.33187V9.87437H6.11188V4.375H7.1225V6.3875C7.38063 5.99375 7.86187 5.77062 8.4175 5.77062C9.46312 5.77062 10.3075 6.64562 10.3075 7.8575C10.3075 9.06937 9.46312 9.95312 8.4175 9.95312C7.86187 9.95312 7.37625 9.72563 7.1225 9.33625V9.33187ZM9.31 7.86625C9.31 7.18812 8.82875 6.6675 8.19437 6.6675C7.56 6.6675 7.0875 7.18812 7.0875 7.86625C7.0875 8.54437 7.56437 9.05625 8.19437 9.05625C8.82437 9.05625 9.31 8.53562 9.31 7.86625ZM10.7275 7.86625C10.7275 6.65437 11.585 5.77062 12.8013 5.77062C13.23 5.77062 13.5931 5.85375 13.9475 6.04188V7.01313C13.6237 6.79438 13.3088 6.6675 12.9588 6.6675C12.2369 6.6675 11.7469 7.17937 11.7469 7.86625C11.7469 8.55312 12.2369 9.05625 12.9588 9.05625C13.3044 9.05625 13.6281 8.9075 13.9475 8.71062V9.68187C13.5931 9.86125 13.23 9.95312 12.8013 9.95312C11.5894 9.95312 10.7275 9.07375 10.7275 7.86625Z" fill="currentColor" />
        </svg>
    },
    textarea: {
      label: 'Multi-line text',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.41938 4.6025H3.66187L5.6525 9.87437H4.54563L4.16937 8.82875H1.91625L1.54 9.87437H0.4375L2.41938 4.6025ZM3.85 7.92313L3.045 5.67L2.24 7.92313H3.85438H3.85ZM7.1225 9.33187V9.87437H6.11188V4.375H7.1225V6.3875C7.38063 5.99375 7.86187 5.77062 8.4175 5.77062C9.46312 5.77062 10.3075 6.64562 10.3075 7.8575C10.3075 9.06937 9.46312 9.95312 8.4175 9.95312C7.86187 9.95312 7.37625 9.72563 7.1225 9.33625V9.33187ZM9.31 7.86625C9.31 7.18812 8.82875 6.6675 8.19437 6.6675C7.56 6.6675 7.0875 7.18812 7.0875 7.86625C7.0875 8.54437 7.56437 9.05625 8.19437 9.05625C8.82437 9.05625 9.31 8.53562 9.31 7.86625ZM10.7275 7.86625C10.7275 6.65437 11.585 5.77062 12.8013 5.77062C13.23 5.77062 13.5931 5.85375 13.9475 6.04188V7.01313C13.6237 6.79438 13.3088 6.6675 12.9588 6.6675C12.2369 6.6675 11.7469 7.17937 11.7469 7.86625C11.7469 8.55312 12.2369 9.05625 12.9588 9.05625C13.3044 9.05625 13.6281 8.9075 13.9475 8.71062V9.68187C13.5931 9.86125 13.23 9.95312 12.8013 9.95312C11.5894 9.95312 10.7275 9.07375 10.7275 7.86625Z" fill="currentColor" />
        </svg>
    },
    phonenumber: {
      label: 'Phone number',
      icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0\_3007\_2496)">
        <path d="M1.23352 4.66121C0.997266 4.66121 0.806016 4.46996 0.806016 4.23371C0.806016 3.99746 0.997266 3.80621 1.23352 3.80246L11.5198 3.77246C11.756 3.77246 11.9473 3.96371 11.9473 4.19996C11.9473 4.43621 11.756 4.62746 11.5198 4.63121L1.23352 4.66121ZM10.661 8.08871H0.374766C0.261386 8.08871 0.152649 8.04367 0.0724775 7.9635C-0.00769432 7.88333 -0.0527344 7.77459 -0.0527344 7.66121C-0.0527344 7.54783 -0.00769432 7.43909 0.0724775 7.35892C0.152649 7.27875 0.261386 7.23371 0.374766 7.23371H10.661C10.7744 7.23371 10.8831 7.27875 10.9633 7.35892C11.0435 7.43909 11.0885 7.54783 11.0885 7.66121C11.0885 7.77459 11.0435 7.88333 10.9633 7.9635C10.8831 8.04367 10.7744 8.08871 10.661 8.08871Z" fill="currentColor" />
        <path d="M2.51668 11.9476C2.45075 11.9478 2.38566 11.9328 2.32644 11.9038C2.26723 11.8748 2.2155 11.8326 2.17524 11.7803C2.13499 11.7281 2.1073 11.6673 2.09433 11.6027C2.08136 11.538 2.08345 11.4713 2.10043 11.4076L5.08918 0.262569C5.15293 0.0338189 5.38543 -0.101181 5.61418 -0.041181C5.84293 0.018819 5.97793 0.255069 5.91793 0.483819L2.93293 11.6251C2.88043 11.8163 2.70793 11.9438 2.52043 11.9438L2.51668 11.9476ZM6.39043 11.9476C6.3245 11.9478 6.25941 11.9328 6.20019 11.9038C6.14098 11.8748 6.08925 11.8326 6.04899 11.7803C6.00874 11.7281 5.98105 11.6673 5.96808 11.6027C5.95511 11.538 5.9572 11.4713 5.97418 11.4076L8.96293 0.262569C9.02293 0.0338189 9.25918 -0.101181 9.48793 -0.041181C9.71668 0.018819 9.85168 0.255069 9.79168 0.483819L6.80668 11.6251C6.75418 11.8163 6.58168 11.9438 6.39418 11.9438L6.39043 11.9476Z" fill="currentColor" />
        </g>
        <defs>
        <clipPath id="clip0\_3007\_2496">
        <rect width="12" height="12" fill="white" />
        </clipPath>
        </defs>
        </svg>
    },
    booleancheckbox: {
      label: 'Single checkbox',
      icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.14125 10.2863H1.28625C0.5775 10.2863 0 9.70875 0 9V2.14125C0 2.02787 0.04504 1.91913 0.125212 1.83896C0.205384 1.75879 0.31412 1.71375 0.4275 1.71375C0.54088 1.71375 0.649616 1.75879 0.729788 1.83896C0.80996 1.91913 0.855 2.02787 0.855 2.14125V9C0.855 9.23625 1.04625 9.4275 1.2825 9.4275H8.14125C8.25463 9.4275 8.36337 9.47254 8.44354 9.55271C8.52371 9.63288 8.56875 9.74162 8.56875 9.855C8.56875 9.96838 8.52371 10.0771 8.44354 10.1573C8.36337 10.2375 8.25463 10.2825 8.14125 10.2825V10.2863Z" fill="currentColor" />
        <path d="M9 8.56875H3C2.29125 8.56875 1.71375 7.99125 1.71375 7.2825V1.28625C1.71375 0.5775 2.29125 0 3 0H9C9.70875 0 10.2863 0.5775 10.2863 1.28625V7.28625C10.2863 7.995 9.70875 8.5725 9 8.5725V8.56875ZM3 0.855C2.76375 0.855 2.5725 1.04625 2.5725 1.2825V7.2825C2.5725 7.51875 2.76375 7.71 3 7.71H9C9.23625 7.71 9.4275 7.51875 9.4275 7.2825V1.28625C9.4275 1.05 9.23625 0.85875 9 0.85875H3V0.855Z" fill="currentColor" />
        <path d="M5.6175 5.8575C5.505 5.8575 5.39625 5.8125 5.31375 5.73375L3.97875 4.39875C3.93861 4.359 3.90675 4.31169 3.88501 4.25955C3.86326 4.20742 3.85207 4.15149 3.85207 4.095C3.85207 4.03851 3.86326 3.98258 3.88501 3.93045C3.90675 3.87831 3.93861 3.831 3.97875 3.79125C4.0185 3.75111 4.06581 3.71925 4.11795 3.69751C4.17008 3.67576 4.22601 3.66457 4.2825 3.66457C4.33899 3.66457 4.39492 3.67576 4.44705 3.69751C4.49919 3.71925 4.5465 3.75111 4.58625 3.79125L5.6025 4.8075L7.395 2.85375C7.55625 2.68125 7.82625 2.66625 7.99875 2.8275C8.175 2.98875 8.18625 3.25875 8.025 3.435L5.92875 5.71875C5.85 5.805 5.7375 5.85375 5.62125 5.8575H5.61375H5.6175Z" fill="currentColor" />
        </svg>
    },
    checkbox: {
      label: 'Multiple checkboxes',
      icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.14125 10.2863H1.28625C0.5775 10.2863 0 9.70875 0 9V2.14125C0 2.02787 0.04504 1.91913 0.125212 1.83896C0.205384 1.75879 0.31412 1.71375 0.4275 1.71375C0.54088 1.71375 0.649616 1.75879 0.729788 1.83896C0.80996 1.91913 0.855 2.02787 0.855 2.14125V9C0.855 9.23625 1.04625 9.4275 1.2825 9.4275H8.14125C8.25463 9.4275 8.36337 9.47254 8.44354 9.55271C8.52371 9.63288 8.56875 9.74162 8.56875 9.855C8.56875 9.96838 8.52371 10.0771 8.44354 10.1573C8.36337 10.2375 8.25463 10.2825 8.14125 10.2825V10.2863Z" fill="currentColor" />
        <path d="M9 8.56875H3C2.29125 8.56875 1.71375 7.99125 1.71375 7.2825V1.28625C1.71375 0.5775 2.29125 0 3 0H9C9.70875 0 10.2863 0.5775 10.2863 1.28625V7.28625C10.2863 7.995 9.70875 8.5725 9 8.5725V8.56875ZM3 0.855C2.76375 0.855 2.5725 1.04625 2.5725 1.2825V7.2825C2.5725 7.51875 2.76375 7.71 3 7.71H9C9.23625 7.71 9.4275 7.51875 9.4275 7.2825V1.28625C9.4275 1.05 9.23625 0.85875 9 0.85875H3V0.855Z" fill="currentColor" />
        <path d="M5.6175 5.8575C5.505 5.8575 5.39625 5.8125 5.31375 5.73375L3.97875 4.39875C3.93861 4.359 3.90675 4.31169 3.88501 4.25955C3.86326 4.20742 3.85207 4.15149 3.85207 4.095C3.85207 4.03851 3.86326 3.98258 3.88501 3.93045C3.90675 3.87831 3.93861 3.831 3.97875 3.79125C4.0185 3.75111 4.06581 3.71925 4.11795 3.69751C4.17008 3.67576 4.22601 3.66457 4.2825 3.66457C4.33899 3.66457 4.39492 3.67576 4.44705 3.69751C4.49919 3.71925 4.5465 3.75111 4.58625 3.79125L5.6025 4.8075L7.395 2.85375C7.55625 2.68125 7.82625 2.66625 7.99875 2.8275C8.175 2.98875 8.18625 3.25875 8.025 3.435L5.92875 5.71875C5.85 5.805 5.7375 5.85375 5.62125 5.8575H5.61375H5.6175Z" fill="currentColor" />
        </svg>
    },
    select: {
      label: 'Dropdown select',
      icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.14125 10.2863H1.28625C0.5775 10.2863 0 9.70875 0 9V2.14125C0 2.02787 0.04504 1.91913 0.125212 1.83896C0.205384 1.75879 0.31412 1.71375 0.4275 1.71375C0.54088 1.71375 0.649616 1.75879 0.729788 1.83896C0.80996 1.91913 0.855 2.02787 0.855 2.14125V9C0.855 9.23625 1.04625 9.4275 1.2825 9.4275H8.14125C8.25463 9.4275 8.36337 9.47254 8.44354 9.55271C8.52371 9.63288 8.56875 9.74162 8.56875 9.855C8.56875 9.96838 8.52371 10.0771 8.44354 10.1573C8.36337 10.2375 8.25463 10.2825 8.14125 10.2825V10.2863Z" fill="currentColor" />
        <path d="M9 8.56875H3C2.29125 8.56875 1.71375 7.99125 1.71375 7.2825V1.28625C1.71375 0.5775 2.29125 0 3 0H9C9.70875 0 10.2863 0.5775 10.2863 1.28625V7.28625C10.2863 7.995 9.70875 8.5725 9 8.5725V8.56875ZM3 0.855C2.76375 0.855 2.5725 1.04625 2.5725 1.2825V7.2825C2.5725 7.51875 2.76375 7.71 3 7.71H9C9.23625 7.71 9.4275 7.51875 9.4275 7.2825V1.28625C9.4275 1.05 9.23625 0.85875 9 0.85875H3V0.855Z" fill="currentColor" />
        <path d="M5.6175 5.8575C5.505 5.8575 5.39625 5.8125 5.31375 5.73375L3.97875 4.39875C3.93861 4.359 3.90675 4.31169 3.88501 4.25955C3.86326 4.20742 3.85207 4.15149 3.85207 4.095C3.85207 4.03851 3.86326 3.98258 3.88501 3.93045C3.90675 3.87831 3.93861 3.831 3.97875 3.79125C4.0185 3.75111 4.06581 3.71925 4.11795 3.69751C4.17008 3.67576 4.22601 3.66457 4.2825 3.66457C4.33899 3.66457 4.39492 3.67576 4.44705 3.69751C4.49919 3.71925 4.5465 3.75111 4.58625 3.79125L5.6025 4.8075L7.395 2.85375C7.55625 2.68125 7.82625 2.66625 7.99875 2.8275C8.175 2.98875 8.18625 3.25875 8.025 3.435L5.92875 5.71875C5.85 5.805 5.7375 5.85375 5.62125 5.8575H5.61375H5.6175Z" fill="currentColor" />
        </svg>
    },
    radio: {
      label: 'Radio select',
      icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.14125 10.2863H1.28625C0.5775 10.2863 0 9.70875 0 9V2.14125C0 2.02787 0.04504 1.91913 0.125212 1.83896C0.205384 1.75879 0.31412 1.71375 0.4275 1.71375C0.54088 1.71375 0.649616 1.75879 0.729788 1.83896C0.80996 1.91913 0.855 2.02787 0.855 2.14125V9C0.855 9.23625 1.04625 9.4275 1.2825 9.4275H8.14125C8.25463 9.4275 8.36337 9.47254 8.44354 9.55271C8.52371 9.63288 8.56875 9.74162 8.56875 9.855C8.56875 9.96838 8.52371 10.0771 8.44354 10.1573C8.36337 10.2375 8.25463 10.2825 8.14125 10.2825V10.2863Z" fill="currentColor" />
        <path d="M9 8.56875H3C2.29125 8.56875 1.71375 7.99125 1.71375 7.2825V1.28625C1.71375 0.5775 2.29125 0 3 0H9C9.70875 0 10.2863 0.5775 10.2863 1.28625V7.28625C10.2863 7.995 9.70875 8.5725 9 8.5725V8.56875ZM3 0.855C2.76375 0.855 2.5725 1.04625 2.5725 1.2825V7.2825C2.5725 7.51875 2.76375 7.71 3 7.71H9C9.23625 7.71 9.4275 7.51875 9.4275 7.2825V1.28625C9.4275 1.05 9.23625 0.85875 9 0.85875H3V0.855Z" fill="currentColor" />
        <path d="M5.6175 5.8575C5.505 5.8575 5.39625 5.8125 5.31375 5.73375L3.97875 4.39875C3.93861 4.359 3.90675 4.31169 3.88501 4.25955C3.86326 4.20742 3.85207 4.15149 3.85207 4.095C3.85207 4.03851 3.86326 3.98258 3.88501 3.93045C3.90675 3.87831 3.93861 3.831 3.97875 3.79125C4.0185 3.75111 4.06581 3.71925 4.11795 3.69751C4.17008 3.67576 4.22601 3.66457 4.2825 3.66457C4.33899 3.66457 4.39492 3.67576 4.44705 3.69751C4.49919 3.71925 4.5465 3.75111 4.58625 3.79125L5.6025 4.8075L7.395 2.85375C7.55625 2.68125 7.82625 2.66625 7.99875 2.8275C8.175 2.98875 8.18625 3.25875 8.025 3.435L5.92875 5.71875C5.85 5.805 5.7375 5.85375 5.62125 5.8575H5.61375H5.6175Z" fill="currentColor" />
        </svg>
    },
    date: {
      label: 'Date picker',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.31445 3.8106C4.03883 3.8106 3.8157 3.58747 3.8157 3.31185V1.31247C3.8157 1.18019 3.86825 1.05333 3.96178 0.959801C4.05532 0.866267 4.18218 0.813721 4.31445 0.813721C4.44673 0.813721 4.57359 0.866267 4.66712 0.959801C4.76066 1.05333 4.8132 1.18019 4.8132 1.31247V3.31185C4.8132 3.58747 4.59008 3.8106 4.31445 3.8106ZM9.31508 3.8106C9.03945 3.8106 8.81633 3.58747 8.81633 3.31185V1.31247C8.81633 1.18019 8.86887 1.05333 8.96241 0.959801C9.05594 0.866267 9.1828 0.813721 9.31508 0.813721C9.44735 0.813721 9.57421 0.866267 9.66775 0.959801C9.76128 1.05333 9.81383 1.18019 9.81383 1.31247V3.31185C9.81383 3.58747 9.5907 3.8106 9.31508 3.8106ZM8.3132 5.80997H1.3132C1.18093 5.80997 1.05407 5.75742 0.960534 5.66389C0.867 5.57036 0.814453 5.4435 0.814453 5.31122C0.814453 5.17894 0.867 5.05209 0.960534 4.95855C1.05407 4.86502 1.18093 4.81247 1.3132 4.81247H8.3132C8.44548 4.81247 8.57234 4.86502 8.66587 4.95855C8.75941 5.05209 8.81195 5.17894 8.81195 5.31122C8.81195 5.4435 8.75941 5.57036 8.66587 5.66389C8.57234 5.75742 8.44548 5.80997 8.3132 5.80997ZM8.81195 12.81C8.53633 12.81 8.3132 12.5868 8.3132 12.3112V9.8131C8.3132 8.98622 8.98695 8.31247 9.81383 8.31247H12.312C12.4442 8.31247 12.5711 8.36502 12.6646 8.45855C12.7582 8.55208 12.8107 8.67894 12.8107 8.81122C12.8107 8.9435 12.7582 9.07036 12.6646 9.16389C12.5711 9.25742 12.4442 9.30997 12.312 9.30997H9.81383C9.5382 9.30997 9.31508 9.5331 9.31508 9.80872V12.3068C9.31508 12.5825 9.09195 12.8056 8.81633 12.8056L8.81195 12.81Z" fill="currentColor" />
        <path d="M8.81195 12.81H2.31508C1.4882 12.81 0.814453 12.1363 0.814453 11.3094V7.31065C0.814453 7.17838 0.867 7.05152 0.960534 6.95799C1.05407 6.86445 1.18093 6.8119 1.3132 6.8119C1.44548 6.8119 1.57234 6.86445 1.66587 6.95799C1.75941 7.05152 1.81195 7.17838 1.81195 7.31065V11.3094C1.81195 11.585 2.03508 11.8082 2.3107 11.8082H8.60195L11.8088 8.60128V3.3119C11.8088 3.03628 11.5857 2.81315 11.3101 2.81315H2.31508C2.03945 2.81315 1.81633 3.03628 1.81633 3.3119V5.31128C1.81633 5.37678 1.80343 5.44163 1.77836 5.50214C1.7533 5.56265 1.71656 5.61764 1.67025 5.66395C1.62393 5.71026 1.56895 5.747 1.50844 5.77206C1.44793 5.79713 1.38307 5.81003 1.31758 5.81003C1.25208 5.81003 1.18723 5.79713 1.12671 5.77206C1.0662 5.747 1.01122 5.71026 0.964909 5.66395C0.918595 5.61764 0.881858 5.56265 0.856793 5.50214C0.831729 5.44163 0.818828 5.37678 0.818828 5.31128V3.3119C0.818828 2.48503 1.49258 1.81128 2.31945 1.81128H11.3188C12.1457 1.81128 12.8195 2.48503 12.8195 3.3119V8.81128C12.8195 8.94253 12.767 9.0694 12.6751 9.16565L9.17508 12.6657C9.0832 12.7575 8.95633 12.81 8.8207 12.81H8.81195Z" fill="currentColor" />
        <path d="M10.3126 5.81H1.3132C1.18093 5.81 1.05407 5.75745 0.960534 5.66392C0.867 5.57039 0.814453 5.44353 0.814453 5.31125C0.814453 5.17897 0.867 5.05211 0.960534 4.95858C1.05407 4.86505 1.18093 4.8125 1.3132 4.8125H10.3126C10.4449 4.8125 10.5717 4.86505 10.6652 4.95858C10.7588 5.05211 10.8113 5.17897 10.8113 5.31125C10.8113 5.44353 10.7588 5.57039 10.6652 5.66392C10.5717 5.75745 10.4449 5.81 10.3126 5.81Z" fill="currentColor" />
        </svg>
    },
    datetime: {
      label: 'Date and time picker',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.31445 3.8106C4.03883 3.8106 3.8157 3.58747 3.8157 3.31185V1.31247C3.8157 1.18019 3.86825 1.05333 3.96178 0.959801C4.05532 0.866267 4.18218 0.813721 4.31445 0.813721C4.44673 0.813721 4.57359 0.866267 4.66712 0.959801C4.76066 1.05333 4.8132 1.18019 4.8132 1.31247V3.31185C4.8132 3.58747 4.59008 3.8106 4.31445 3.8106ZM9.31508 3.8106C9.03945 3.8106 8.81633 3.58747 8.81633 3.31185V1.31247C8.81633 1.18019 8.86887 1.05333 8.96241 0.959801C9.05594 0.866267 9.1828 0.813721 9.31508 0.813721C9.44735 0.813721 9.57421 0.866267 9.66775 0.959801C9.76128 1.05333 9.81383 1.18019 9.81383 1.31247V3.31185C9.81383 3.58747 9.5907 3.8106 9.31508 3.8106ZM8.3132 5.80997H1.3132C1.18093 5.80997 1.05407 5.75742 0.960534 5.66389C0.867 5.57036 0.814453 5.4435 0.814453 5.31122C0.814453 5.17894 0.867 5.05209 0.960534 4.95855C1.05407 4.86502 1.18093 4.81247 1.3132 4.81247H8.3132C8.44548 4.81247 8.57234 4.86502 8.66587 4.95855C8.75941 5.05209 8.81195 5.17894 8.81195 5.31122C8.81195 5.4435 8.75941 5.57036 8.66587 5.66389C8.57234 5.75742 8.44548 5.80997 8.3132 5.80997ZM8.81195 12.81C8.53633 12.81 8.3132 12.5868 8.3132 12.3112V9.8131C8.3132 8.98622 8.98695 8.31247 9.81383 8.31247H12.312C12.4442 8.31247 12.5711 8.36502 12.6646 8.45855C12.7582 8.55208 12.8107 8.67894 12.8107 8.81122C12.8107 8.9435 12.7582 9.07036 12.6646 9.16389C12.5711 9.25742 12.4442 9.30997 12.312 9.30997H9.81383C9.5382 9.30997 9.31508 9.5331 9.31508 9.80872V12.3068C9.31508 12.5825 9.09195 12.8056 8.81633 12.8056L8.81195 12.81Z" fill="currentColor" />
        <path d="M8.81195 12.81H2.31508C1.4882 12.81 0.814453 12.1363 0.814453 11.3094V7.31065C0.814453 7.17838 0.867 7.05152 0.960534 6.95799C1.05407 6.86445 1.18093 6.8119 1.3132 6.8119C1.44548 6.8119 1.57234 6.86445 1.66587 6.95799C1.75941 7.05152 1.81195 7.17838 1.81195 7.31065V11.3094C1.81195 11.585 2.03508 11.8082 2.3107 11.8082H8.60195L11.8088 8.60128V3.3119C11.8088 3.03628 11.5857 2.81315 11.3101 2.81315H2.31508C2.03945 2.81315 1.81633 3.03628 1.81633 3.3119V5.31128C1.81633 5.37678 1.80343 5.44163 1.77836 5.50214C1.7533 5.56265 1.71656 5.61764 1.67025 5.66395C1.62393 5.71026 1.56895 5.747 1.50844 5.77206C1.44793 5.79713 1.38307 5.81003 1.31758 5.81003C1.25208 5.81003 1.18723 5.79713 1.12671 5.77206C1.0662 5.747 1.01122 5.71026 0.964909 5.66395C0.918595 5.61764 0.881858 5.56265 0.856793 5.50214C0.831729 5.44163 0.818828 5.37678 0.818828 5.31128V3.3119C0.818828 2.48503 1.49258 1.81128 2.31945 1.81128H11.3188C12.1457 1.81128 12.8195 2.48503 12.8195 3.3119V8.81128C12.8195 8.94253 12.767 9.0694 12.6751 9.16565L9.17508 12.6657C9.0832 12.7575 8.95633 12.81 8.8207 12.81H8.81195Z" fill="currentColor" />
        <path d="M10.3126 5.81H1.3132C1.18093 5.81 1.05407 5.75745 0.960534 5.66392C0.867 5.57039 0.814453 5.44353 0.814453 5.31125C0.814453 5.17897 0.867 5.05211 0.960534 4.95858C1.05407 4.86505 1.18093 4.8125 1.3132 4.8125H10.3126C10.4449 4.8125 10.5717 4.86505 10.6652 4.95858C10.7588 5.05211 10.8113 5.17897 10.8113 5.31125C10.8113 5.44353 10.7588 5.57039 10.6652 5.66392C10.5717 5.75745 10.4449 5.81 10.3126 5.81Z" fill="currentColor" />
        </svg>
    },
    number: {
      label: 'Number',
      icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0\_3007\_2496)">
        <path d="M1.23352 4.66121C0.997266 4.66121 0.806016 4.46996 0.806016 4.23371C0.806016 3.99746 0.997266 3.80621 1.23352 3.80246L11.5198 3.77246C11.756 3.77246 11.9473 3.96371 11.9473 4.19996C11.9473 4.43621 11.756 4.62746 11.5198 4.63121L1.23352 4.66121ZM10.661 8.08871H0.374766C0.261386 8.08871 0.152649 8.04367 0.0724775 7.9635C-0.00769432 7.88333 -0.0527344 7.77459 -0.0527344 7.66121C-0.0527344 7.54783 -0.00769432 7.43909 0.0724775 7.35892C0.152649 7.27875 0.261386 7.23371 0.374766 7.23371H10.661C10.7744 7.23371 10.8831 7.27875 10.9633 7.35892C11.0435 7.43909 11.0885 7.54783 11.0885 7.66121C11.0885 7.77459 11.0435 7.88333 10.9633 7.9635C10.8831 8.04367 10.7744 8.08871 10.661 8.08871Z" fill="currentColor" />
        <path d="M2.51668 11.9476C2.45075 11.9478 2.38566 11.9328 2.32644 11.9038C2.26723 11.8748 2.2155 11.8326 2.17524 11.7803C2.13499 11.7281 2.1073 11.6673 2.09433 11.6027C2.08136 11.538 2.08345 11.4713 2.10043 11.4076L5.08918 0.262569C5.15293 0.0338189 5.38543 -0.101181 5.61418 -0.041181C5.84293 0.018819 5.97793 0.255069 5.91793 0.483819L2.93293 11.6251C2.88043 11.8163 2.70793 11.9438 2.52043 11.9438L2.51668 11.9476ZM6.39043 11.9476C6.3245 11.9478 6.25941 11.9328 6.20019 11.9038C6.14098 11.8748 6.08925 11.8326 6.04899 11.7803C6.00874 11.7281 5.98105 11.6673 5.96808 11.6027C5.95511 11.538 5.9572 11.4713 5.97418 11.4076L8.96293 0.262569C9.02293 0.0338189 9.25918 -0.101181 9.48793 -0.041181C9.71668 0.018819 9.85168 0.255069 9.79168 0.483819L6.80668 11.6251C6.75418 11.8163 6.58168 11.9438 6.39418 11.9438L6.39043 11.9476Z" fill="currentColor" />
        </g>
        <defs>
        <clipPath id="clip0\_3007\_2496">
        <rect width="12" height="12" fill="white" />
        </clipPath>
        </defs>
        </svg>
    },
    calculation\_equation: {
      label: 'Equation',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.18582 1.86818C8.18582 1.57943 7.90583 1.32568 7.25395 1.32568C6.51458 1.39568 5.8277 1.73693 5.32458 2.28818C4.74793 2.87191 4.36459 3.61874 4.22645 4.42756H3.46958L3.09333 4.90881L3.1502 5.04006H4.1127C3.90708 6.34381 3.7277 7.40693 3.4477 9.04756C3.11958 11.0119 3.0627 11.8126 2.5552 11.8126C2.17895 11.7294 1.8377 11.5369 1.56208 11.2701C1.5052 11.2219 1.43083 11.2219 1.33458 11.2963C1.08344 11.4854 0.915591 11.7646 0.866451 12.0751C0.840201 12.3901 1.2427 12.6788 1.70208 12.6788C2.20083 12.6263 2.67333 12.4163 3.04083 12.0751C3.87645 11.4013 4.56333 10.6707 4.9702 8.70193C5.2852 7.12256 5.42958 6.13381 5.60895 5.04443C5.8277 5.04443 6.52333 4.99631 6.7202 4.97006L6.98708 4.44068H5.6877C6.03333 2.15693 6.25208 2.03006 6.53208 2.03006C6.81208 2.03006 7.0527 2.24881 7.38958 2.64693C7.49458 2.76943 7.58208 2.74318 7.70458 2.68193C7.95833 2.48068 8.12895 2.18756 8.18145 1.86818H8.18582ZM11.9921 8.56631L10.9158 6.88631C11.3052 6.37006 11.5677 6.04631 11.7296 5.84506C11.9921 5.42943 12.4515 5.18443 12.9458 5.19318V4.81256H10.8677V5.19318C11.314 5.25881 11.3752 5.37256 11.2308 5.63068C11.0865 5.88881 10.894 6.15568 10.6577 6.47943L10.1152 5.63068C9.9577 5.37256 10.0321 5.26756 10.404 5.19318V4.81256H7.7352V5.19318C8.34333 5.27193 8.4527 5.39443 8.78958 5.91943L9.75208 7.49881C9.41958 7.98006 9.1177 8.38693 8.84645 8.70631C8.5577 9.10006 8.11583 9.35381 7.62583 9.40193V9.78256H9.75208V9.40193C9.27083 9.32318 9.2402 9.17006 9.41958 8.85068C9.59895 8.53131 9.80895 8.23818 10.0233 7.93631L10.5877 8.89881C10.7846 9.23568 10.7846 9.34506 10.3165 9.42381V9.80443H13.1252V9.42381C12.6177 9.36256 12.189 9.03006 11.9921 8.56193V8.56631Z" fill="currentColor" />
        </svg>
    },
    calculation\_rollup: {
      label: 'Rollup',
      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.90626 6.69367V5.84492C3.91053 5.80235 3.93025 5.76282 3.96169 5.73379C3.99313 5.70477 4.03411 5.68828 4.07688 5.68742H11.0813C11.1775 5.68742 11.2519 5.60867 11.2519 5.51679V4.15617C11.2519 4.13376 11.2475 4.11158 11.2389 4.09087C11.2303 4.07017 11.2178 4.05136 11.2019 4.03552C11.1861 4.01968 11.1673 4.00711 11.1466 3.99853C11.1259 3.98996 11.1037 3.98554 11.0813 3.98554H4.07688C4.03163 3.98554 3.98823 3.96757 3.95623 3.93557C3.92424 3.90357 3.90626 3.86017 3.90626 3.81492V2.95742C3.90626 2.86117 3.82313 2.78242 3.72688 2.7868C3.69577 2.78671 3.66532 2.79584 3.63938 2.81304L0.94876 4.54555C0.87001 4.59805 0.85251 4.70305 0.90501 4.77742C0.918135 4.79492 0.93126 4.81242 0.94876 4.82117L3.63063 6.83367C3.70501 6.89055 3.81438 6.87742 3.87126 6.79867C3.89313 6.76805 3.90626 6.73305 3.90626 6.69367ZM13.0631 8.90305L10.3813 7.17492C10.3618 7.16246 10.3401 7.15404 10.3174 7.15016C10.2946 7.14628 10.2713 7.14701 10.2489 7.15232C10.2264 7.15763 10.2053 7.1674 10.1867 7.18105C10.1681 7.19471 10.1524 7.21196 10.1406 7.2318C10.1234 7.25773 10.1143 7.28818 10.1144 7.31929V8.20305C10.1144 8.2993 10.0356 8.37367 9.94376 8.37367L3.18876 8.36055C3.14351 8.36055 3.10011 8.37852 3.06811 8.41052C3.03611 8.44252 3.01813 8.48592 3.01813 8.53117V9.84805C3.01813 9.9443 3.09688 10.0187 3.18876 10.0187L9.93501 10.0405C10.0313 10.0405 10.1056 10.1193 10.1056 10.2112V11.0337C10.1054 11.0657 10.1142 11.0972 10.1311 11.1245C10.148 11.1518 10.1722 11.1737 10.2009 11.1879C10.2297 11.2021 10.2619 11.2078 10.2938 11.2045C10.3257 11.2012 10.356 11.189 10.3813 11.1693L13.0631 9.1568C13.1375 9.09992 13.1506 8.99054 13.0938 8.91617L13.0675 8.88992L13.0631 8.90305Z" fill="currentColor" />
        </svg>
    }
  };
  useEffect(() => {
    const checkForAnchorLink = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.substring(1);
        const targetExists = document.getElementById(targetId);
        if (!targetExists && !isInitialized) {
          setForceInitialize(true);
        }
      }
    };
    checkForAnchorLink();
    window.addEventListener('hashchange', checkForAnchorLink);
    return () => window.removeEventListener('hashchange', checkForAnchorLink);
  }, \[isInitialized\]);
  useEffect(() => {
    if (isInitialized && window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          setSelectedProperty(targetId);
        }
      }, 100);
    }
  }, \[isInitialized\]);
  useEffect(() => {
    if (!lazyLoad) return;
    if (forceInitialize) {
      setIsVisible(true);
      setIsInitialized(true);
      setShowSkeleton(false);
      return;
    }
    if (!containerRef.current) return;
    const minDisplayTime = 800;
    const observer = new IntersectionObserver(entries => {
      if (entries\[0\].isIntersecting) {
        const elapsed = Date.now() - loadStartTime.current;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        setIsVisible(true);
        setTimeout(() => {
          setIsInitialized(true);
          setShowSkeleton(false);
        }, remainingTime + 50);
        observer.disconnect();
      }
    }, {
      rootMargin: '100px'
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, \[forceInitialize, lazyLoad\]);
  useEffect(() => {
    if (!isInitialized) return;
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, \[searchTerm, isInitialized\]);
  useEffect(() => {
    if (!isInitialized) return;
    const handleScroll = () => {
      if (listRef.current) {
        const listTop = listRef.current.getBoundingClientRect().top;
        setShowBackToTop(listTop < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, \[isInitialized\]);
  useEffect(() => {
    if (!isInitialized) return;
    const handleClickOutside = event => {
      if (typeDropdownOpen && !event.target.closest('.property-type-filter')) {
        setTypeDropdownOpen(false);
      }
      if (fieldTypeDropdownOpen && !event.target.closest('.property-field-type-filter')) {
        setFieldTypeDropdownOpen(false);
      }
      if (attributeDropdownOpen && !event.target.closest('.property-attribute-filter')) {
        setAttributeDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, \[typeDropdownOpen, fieldTypeDropdownOpen, attributeDropdownOpen, isInitialized\]);
  const properties = Array.isArray(children) ? children : \[children\];
  const propertyData = useMemo(() => properties.filter(child => child && child.type === Property).map(child => child.props), \[children\]);
  const uniqueTypes = useMemo(() => \[...new Set(propertyData.map(prop => prop.type).filter(Boolean))\].sort(), \[propertyData\]);
  const uniqueFieldTypes = useMemo(() => \[...new Set(propertyData.map(prop => {
    if (prop.fieldType && fieldTypeConfigs\[prop.fieldType\]) {
      return fieldTypeConfigs\[prop.fieldType\].label;
    }
    return null;
  }).filter(Boolean))\].sort(), \[propertyData\]);
  useEffect(() => {
    if (!isInitialized || openStates && Object.keys(openStates).length > 0) return;
    const initialStates = {};
    propertyData.forEach(prop => {
      initialStates\[prop.name\] = prop.expanded !== false;
    });
    setOpenStates(initialStates);
  }, \[propertyData, isInitialized\]);
  const filteredProperties = useMemo(() => {
    if (!isInitialized) return \[\];
    return propertyData.filter(prop => {
      const matchesSearch = !debouncedSearchTerm || (prop.name && prop.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || prop.label && prop.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || prop.description && prop.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesType = selectedType === 'all' || prop.type === selectedType;
      const matchesFieldType = selectedFieldType === 'all' || prop.fieldType && fieldTypeConfigs\[prop.fieldType\] && fieldTypeConfigs\[prop.fieldType\].label === selectedFieldType;
      let matchesAttribute = true;
      if (selectedAttribute !== 'all') {
        if (selectedAttribute === 'Primary display property') {
          matchesAttribute = prop.primaryDisplayProperty === true;
        } else if (selectedAttribute === 'Secondary display property') {
          matchesAttribute = prop.secondaryDisplayProperty === true;
        } else if (selectedAttribute === 'Searchable') {
          matchesAttribute = prop.searchable === true;
        }
      }
      return matchesSearch && matchesType && matchesFieldType && matchesAttribute;
    });
  }, \[propertyData, debouncedSearchTerm, selectedType, selectedFieldType, selectedAttribute, isInitialized\]);
  const toggleProperty = useCallback(name => {
    setOpenStates(prev => ({
      ...prev,
      \[name\]: !prev\[name\]
    }));
  }, \[\]);
  const toggleAllProperties = useCallback(() => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    const newOpenStates = {};
    propertyData.forEach(prop => {
      newOpenStates\[prop.name\] = newExpandedState;
    });
    setOpenStates(newOpenStates);
  }, \[allExpanded, propertyData\]);
  const formatDataType = type => {
    const formatted = type.replace(/\_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };
  const copyAnchorLink = useCallback(async propertyName => {
    const url = \`${window.location.origin}${window.location.pathname}#${propertyName}\`;
    setSelectedProperty(propertyName);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinks(prev => ({
        ...prev,
        \[propertyName\]: true
      }));
      const targetElement = document.getElementById(propertyName);
      if (targetElement) {
        if (compact) {
          const container = listRef.current;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 20;
            container.scrollTo({
              top: scrollOffset,
              behavior: 'smooth'
            });
          }
        } else {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
        setTimeout(() => {
          targetElement.focus({
            preventScroll: true
          });
        }, 500);
      }
      history.replaceState(null, null, \`#${propertyName}\`);
      setTimeout(() => {
        setCopiedLinks(prev => ({
          ...prev,
          \[propertyName\]: false
        }));
      }, 1500);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  }, \[compact\]);
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, \[\]);
  const handleDropdownOptionKeyDown = useCallback((e, closeDropdown) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      e.currentTarget.closest('.property-type-filter, .property-field-type-filter, .property-attribute-filter')?.querySelector('.property-type-filter-button')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextOption = e.currentTarget.nextElementSibling;
      if (nextOption) {
        nextOption.focus();
      } else {
        const firstOption = e.currentTarget.parentElement?.querySelector('button');
        firstOption?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevOption = e.currentTarget.previousElementSibling;
      if (prevOption) {
        prevOption.focus();
      } else {
        const options = e.currentTarget.parentElement?.querySelectorAll('button');
        const lastOption = options?.\[options.length - 1\];
        lastOption?.focus();
      }
    }
  }, \[\]);
  const handleCopyCode = useCallback(async (text, propertyName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodes(prev => ({
        ...prev,
        \[propertyName\]: true
      }));
      const status = document.getElementById(\`copy-code-${propertyName}-status\`);
      if (status) {
        status.textContent = 'Code copied to clipboard';
      }
      setTimeout(() => {
        setCopiedCodes(prev => ({
          ...prev,
          \[propertyName\]: false
        }));
        const status = document.getElementById(\`copy-code-${propertyName}-status\`);
        if (status) {
          status.textContent = '';
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      const status = document.getElementById(\`copy-code-${propertyName}-status\`);
      if (status) {
        status.textContent = 'Failed to copy code';
      }
    }
  }, \[\]);
  if (showSkeleton) {
    return <div id="property-definitions" className={\`property-definitions-wrapper skeleton-loader skeleton-loader-wrapper ${!border ? 'no-border' : ''}\`} ref={containerRef} role="region" aria-label="Loading properties" aria-busy="true">
        {searchable && <>
            <div className="property-definitions-search-row skeleton-search-row">
              <div className="skeleton-search-input"></div>
            </div>
            <div className="property-definitions-filter-row skeleton-filter-row">
              <div className="skeleton-filter-button"></div>
              <div className="skeleton-filter-button"></div>
              <div className="skeleton-filter-button"></div>
            </div>
          </>}
        <div className="skeleton-items-container">
          {\[1, 2, 3, 4, 5\].map(i => <div key={i} className="skeleton-property-item">
              <div className="skeleton-property-placeholder"></div>
            </div>)}
        </div>
      </div>;
  }
  return <div id="property-definitions" className="property-definitions-wrapper" ref={containerRef}>
      {searchable && <>
          <div className="property-definitions-search-row">
            <div className="property-definitions-search">
              <label htmlFor="property-search" className="sr-only">
                {placeholder}
              </label>
              <input id="property-search" type="text" placeholder={placeholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} maxLength={75} className="property-definitions-input" aria-label={placeholder} />
              <span className="property-definitions-input-icon" aria-hidden="true">
              <Icon icon="magnifying-glass" size="16" />
              </span>
            </div>

            <div className="property-definitions-results-count" role="status" aria-live="polite">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
            </div>

            <button onClick={toggleAllProperties} className="collapse-all-button" type="button" aria-label={allExpanded ? 'Collapse all properties' : 'Expand all properties'}>
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          <div className="property-definitions-filter-row">
            <p className="filter-by-label">Filter by:</p>

            <div className="property-type-filter">
            <button onClick={() => {
    setFieldTypeDropdownOpen(false);
    setAttributeDropdownOpen(false);
    setTypeDropdownOpen(!typeDropdownOpen);
  }} onKeyDown={e => {
    if (e.key === 'Escape' && typeDropdownOpen) {
      e.preventDefault();
      setTypeDropdownOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!typeDropdownOpen) {
        setFieldTypeDropdownOpen(false);
        setAttributeDropdownOpen(false);
        setTypeDropdownOpen(true);
      } else {
        const dropdown = e.currentTarget.nextElementSibling;
        const firstOption = dropdown?.querySelector('button');
        firstOption?.focus();
      }
    } else if (e.key === 'ArrowUp' && typeDropdownOpen) {
      e.preventDefault();
      const dropdown = e.currentTarget.nextElementSibling;
      const options = dropdown?.querySelectorAll('button');
      const lastOption = options?.\[options.length - 1\];
      lastOption?.focus();
    }
  }} className="property-type-filter-button" aria-expanded={typeDropdownOpen} aria-haspopup="true" type="button">
              <span>{selectedType === 'all' ? 'Data type' : formatDataType(selectedType)}</span>
              <svg className={\`filter-chevron ${typeDropdownOpen ? 'open' : ''}\`} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.38065 0.381075C3.46191 0.299739 3.55841 0.235216 3.66462 0.191193C3.77083 0.147171 3.88468 0.124512 3.99965 0.124512C4.11463 0.124512 4.22847 0.147171 4.33468 0.191193C4.4409 0.235216 4.53739 0.299739 4.61865 0.381075L9.61865 5.38107C9.69999 5.46234 9.76451 5.55883 9.80853 5.66504C9.85256 5.77125 9.87522 5.8851 9.87522 6.00007C9.87522 6.11505 9.85256 6.2289 9.80853 6.33511C9.76451 6.44132 9.69999 6.53781 9.61865 6.61907L4.61865 11.6191C4.45435 11.7834 4.23151 11.8757 3.99915 11.8757C3.76679 11.8757 3.54395 11.7834 3.37965 11.6191C3.21535 11.4548 3.12305 11.2319 3.12305 10.9996C3.12305 10.7672 3.21535 10.5444 3.37965 10.3801L7.76265 6.00007L3.37965 1.61907C3.29832 1.53781 3.23379 1.44132 3.18977 1.33511C3.14575 1.2289 3.12309 1.11505 3.12309 1.00007C3.12309 0.885101 3.14575 0.771255 3.18977 0.665043C3.23379 0.558831 3.29932 0.462337 3.38065 0.381075Z" fill="currentColor" />
              </svg>
            </button>

            {typeDropdownOpen && <div className="property-type-dropdown">
                <button onClick={() => {
    setSelectedType('all');
    setTypeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setTypeDropdownOpen(false))} className={\`property-type-option ${selectedType === 'all' ? 'selected' : ''}\`} type="button">
                  All data types
                </button>
                {uniqueTypes.map(type => <button key={type} onClick={() => {
    setSelectedType(type);
    setTypeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setTypeDropdownOpen(false))} className={\`property-type-option ${selectedType === type ? 'selected' : ''}\`} type="button">
                    {formatDataType(type)}
                  </button>)}
              </div>}
          </div>

          <div className="property-field-type-filter">
            <button onClick={() => {
    setTypeDropdownOpen(false);
    setAttributeDropdownOpen(false);
    setFieldTypeDropdownOpen(!fieldTypeDropdownOpen);
  }} onKeyDown={e => {
    if (e.key === 'Escape' && fieldTypeDropdownOpen) {
      e.preventDefault();
      setFieldTypeDropdownOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!fieldTypeDropdownOpen) {
        setTypeDropdownOpen(false);
        setAttributeDropdownOpen(false);
        setFieldTypeDropdownOpen(true);
      } else {
        const dropdown = e.currentTarget.nextElementSibling;
        const firstOption = dropdown?.querySelector('button');
        firstOption?.focus();
      }
    } else if (e.key === 'ArrowUp' && fieldTypeDropdownOpen) {
      e.preventDefault();
      const dropdown = e.currentTarget.nextElementSibling;
      const options = dropdown?.querySelectorAll('button');
      const lastOption = options?.\[options.length - 1\];
      lastOption?.focus();
    }
  }} className="property-type-filter-button" aria-expanded={fieldTypeDropdownOpen} aria-haspopup="true" type="button">
              <span>{selectedFieldType === 'all' ? 'Display type' : selectedFieldType}</span>
              <svg className={\`filter-chevron ${fieldTypeDropdownOpen ? 'open' : ''}\`} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.38065 0.381075C3.46191 0.299739 3.55841 0.235216 3.66462 0.191193C3.77083 0.147171 3.88468 0.124512 3.99965 0.124512C4.11463 0.124512 4.22847 0.147171 4.33468 0.191193C4.4409 0.235216 4.53739 0.299739 4.61865 0.381075L9.61865 5.38107C9.69999 5.46234 9.76451 5.55883 9.80853 5.66504C9.85256 5.77125 9.87522 5.8851 9.87522 6.00007C9.87522 6.11505 9.85256 6.2289 9.80853 6.33511C9.76451 6.44132 9.69999 6.53781 9.61865 6.61907L4.61865 11.6191C4.45435 11.7834 4.23151 11.8757 3.99915 11.8757C3.76679 11.8757 3.54395 11.7834 3.37965 11.6191C3.21535 11.4548 3.12305 11.2319 3.12305 10.9996C3.12305 10.7672 3.21535 10.5444 3.37965 10.3801L7.76265 6.00007L3.37965 1.61907C3.29832 1.53781 3.23379 1.44132 3.18977 1.33511C3.14575 1.2289 3.12309 1.11505 3.12309 1.00007C3.12309 0.885101 3.14575 0.771255 3.18977 0.665043C3.23379 0.558831 3.29932 0.462337 3.38065 0.381075Z" fill="currentColor" />
              </svg>
            </button>

            {fieldTypeDropdownOpen && <div className="property-type-dropdown">
                <button onClick={() => {
    setSelectedFieldType('all');
    setFieldTypeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setFieldTypeDropdownOpen(false))} className={\`property-type-option ${selectedFieldType === 'all' ? 'selected' : ''}\`} type="button">
                  All display types
                </button>
                {uniqueFieldTypes.map(fieldType => <button key={fieldType} onClick={() => {
    setSelectedFieldType(fieldType);
    setFieldTypeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setFieldTypeDropdownOpen(false))} className={\`property-type-option ${selectedFieldType === fieldType ? 'selected' : ''}\`} type="button">
                    {fieldType}
                  </button>)}
              </div>}
          </div>

          <div className="property-attribute-filter">
            <button onClick={() => {
    setTypeDropdownOpen(false);
    setFieldTypeDropdownOpen(false);
    setAttributeDropdownOpen(!attributeDropdownOpen);
  }} onKeyDown={e => {
    if (e.key === 'Escape' && attributeDropdownOpen) {
      e.preventDefault();
      setAttributeDropdownOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!attributeDropdownOpen) {
        setTypeDropdownOpen(false);
        setFieldTypeDropdownOpen(false);
        setAttributeDropdownOpen(true);
      } else {
        const dropdown = e.currentTarget.nextElementSibling;
        const firstOption = dropdown?.querySelector('button');
        firstOption?.focus();
      }
    } else if (e.key === 'ArrowUp' && attributeDropdownOpen) {
      e.preventDefault();
      const dropdown = e.currentTarget.nextElementSibling;
      const options = dropdown?.querySelectorAll('button');
      const lastOption = options?.\[options.length - 1\];
      lastOption?.focus();
    }
  }} className="property-type-filter-button" aria-expanded={attributeDropdownOpen} aria-haspopup="true" type="button">
              <span>{selectedAttribute === 'all' ? 'Attribute' : selectedAttribute}</span>
              <svg className={\`filter-chevron ${attributeDropdownOpen ? 'open' : ''}\`} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.38065 0.381075C3.46191 0.299739 3.55841 0.235216 3.66462 0.191193C3.77083 0.147171 3.88468 0.124512 3.99965 0.124512C4.11463 0.124512 4.22847 0.147171 4.33468 0.191193C4.4409 0.235216 4.53739 0.299739 4.61865 0.381075L9.61865 5.38107C9.69999 5.46234 9.76451 5.55883 9.80853 5.66504C9.85256 5.77125 9.87522 5.8851 9.87522 6.00007C9.87522 6.11505 9.85256 6.2289 9.80853 6.33511C9.76451 6.44132 9.69999 6.53781 9.61865 6.61907L4.61865 11.6191C4.45435 11.7834 4.23151 11.8757 3.99915 11.8757C3.76679 11.8757 3.54395 11.7834 3.37965 11.6191C3.21535 11.4548 3.12305 11.2319 3.12305 10.9996C3.12305 10.7672 3.21535 10.5444 3.37965 10.3801L7.76265 6.00007L3.37965 1.61907C3.29832 1.53781 3.23379 1.44132 3.18977 1.33511C3.14575 1.2289 3.12309 1.11505 3.12309 1.00007C3.12309 0.885101 3.14575 0.771255 3.18977 0.665043C3.23379 0.558831 3.29932 0.462337 3.38065 0.381075Z" fill="currentColor" />
              </svg>
            </button>

            {attributeDropdownOpen && <div className="property-type-dropdown">
                <button onClick={() => {
    setSelectedAttribute('all');
    setAttributeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setAttributeDropdownOpen(false))} className={\`property-type-option ${selectedAttribute === 'all' ? 'selected' : ''}\`} type="button">
                  All attributes
                </button>
                <button onClick={() => {
    setSelectedAttribute('Primary display property');
    setAttributeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setAttributeDropdownOpen(false))} className={\`property-type-option ${selectedAttribute === 'Primary display property' ? 'selected' : ''}\`} type="button">Primary display property
                </button>
                <button onClick={() => {
    setSelectedAttribute('Secondary display property');
    setAttributeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setAttributeDropdownOpen(false))} className={\`property-type-option ${selectedAttribute === 'Secondary display property' ? 'selected' : ''}\`} type="button">Secondary display property
                </button>
                <button onClick={() => {
    setSelectedAttribute('Searchable');
    setAttributeDropdownOpen(false);
  }} onKeyDown={e => handleDropdownOptionKeyDown(e, () => setAttributeDropdownOpen(false))} className={\`property-type-option ${selectedAttribute === 'Searchable' ? 'selected' : ''}\`} type="button">
                  Searchable
                </button>
              </div>}
          </div>
        </div>
        </>}

      <dl className="property-definitions-list" ref={listRef} style={compact ? {
    maxHeight: '800px',
    overflowY: 'scroll'
  } : {}}>
        {filteredProperties.length > 0 ? filteredProperties.map(property => {
    const isOpen = openStates\[property.name\] !== undefined ? openStates\[property.name\] : true;
    const fieldTypeConfig = fieldTypeConfigs\[property.fieldType\] || ({
      label: property.fieldType,
      icon: null
    });
    const elements = \[<dt key={\`dt-${property.name}\`} id={property.name} className="property-definition-term" onMouseEnter={() => setHoveredProperty(property.name)} onMouseLeave={() => setHoveredProperty(null)}>
                <div className={\`property-link-icon ${selectedProperty === property.name || hoveredProperty === property.name ? 'selected' : ''}\`} onClick={e => {
      e.stopPropagation();
      copyAnchorLink(property.name);
    }} role="button" tabIndex={0} aria-label={\`Copy link to ${property.name} property\`} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        copyAnchorLink(property.name);
      }
    }}>
                  {copiedLinks\[property.name\] ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="copy-success-icon">
                      <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg> : <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" focusable="false" data-icon-name="Link" class="StyledIcon-sc-186h16e-0 ijKTrl"><path d="M10.47 29.5c-1.95 0-3.9-.74-5.38-2.22s-2.23-3.35-2.23-5.38.79-3.94 2.23-5.38l2.29-2.29c.45-.45 1.17-.45 1.62 0s.45 1.17 0 1.62l-2.29 2.29c-1.01 1.01-1.56 2.34-1.56 3.76s.55 2.76 1.56 3.76a5.34 5.34 0 0 0 7.53 0l2.29-2.29c.45-.45 1.17-.45 1.62 0s.45 1.17 0 1.62l-2.29 2.29a7.59 7.59 0 0 1-5.38 2.22ZM24.18 18.47c-.29 0-.58-.11-.81-.33a1.14 1.14 0 0 1 0-1.62l2.29-2.29a5.34 5.34 0 0 0 0-7.53c-2.08-2.08-5.45-2.07-7.53 0l-2.29 2.29c-.45.45-1.17.45-1.62 0s-.45-1.17 0-1.62l2.29-2.29a7.61 7.61 0 0 1 10.76 0 7.61 7.61 0 0 1 0 10.76l-2.29 2.29c-.22.22-.52.33-.81.33Z"></path><path d="M12.75 20.75c-.29 0-.58-.11-.81-.33a1.14 1.14 0 0 1 0-1.62l6.86-6.86c.45-.45 1.17-.45 1.62 0s.45 1.17 0 1.62l-6.86 6.86c-.22.22-.52.33-.81.33"></path></svg>}
                </div>
                <div className={\`property-chevron ${isOpen ? 'open' : ''}\`} onClick={() => toggleProperty(property.name)} role="button" tabIndex={0} aria-label={\`${isOpen ? 'Collapse' : 'Expand'} ${property.name} property\`} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleProperty(property.name);
      }
    }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.38065 0.381075C3.46191 0.299739 3.55841 0.235216 3.66462 0.191193C3.77083 0.147171 3.88468 0.124512 3.99965 0.124512C4.11463 0.124512 4.22847 0.147171 4.33468 0.191193C4.4409 0.235216 4.53739 0.299739 4.61865 0.381075L9.61865 5.38107C9.69999 5.46234 9.76451 5.55883 9.80853 5.66504C9.85256 5.77125 9.87522 5.8851 9.87522 6.00007C9.87522 6.11505 9.85256 6.2289 9.80853 6.33511C9.76451 6.44132 9.69999 6.53781 9.61865 6.61907L4.61865 11.6191C4.45435 11.7834 4.23151 11.8757 3.99915 11.8757C3.76679 11.8757 3.54395 11.7834 3.37965 11.6191C3.21535 11.4548 3.12305 11.2319 3.12305 10.9996C3.12305 10.7672 3.21535 10.5444 3.37965 10.3801L7.76265 6.00007L3.37965 1.61907C3.29832 1.53781 3.23379 1.44132 3.18977 1.33511C3.14575 1.2289 3.12309 1.11505 3.12309 1.00007C3.12309 0.885101 3.14575 0.771255 3.18977 0.665043C3.23379 0.558831 3.29932 0.462337 3.38065 0.381075Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="property-definition-content">
                  <button onClick={() => toggleProperty(property.name)} aria-expanded={isOpen} type="button" className="property-label-button" aria-label={\`${isOpen ? 'Collapse' : 'Expand'} ${property.label}\`}>
                    <span className="property-label">{property.label}</span>
                  </button>
                  <span id={\`copy-code-${property.name}\`} className="copy-code">
                    <span className="code-text" onClick={e => {
      e.stopPropagation();
      handleCopyCode(property.name, property.name);
    }} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleCopyCode(property.name, property.name);
      }
    }} role="button" tabIndex={0} aria-label={copiedCodes\[property.name\] ? 'Code copied to clipboard' : 'Copy code to clipboard'}>
                      <code>{property.name}</code>
                      {copiedCodes\[property.name\] ? <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="copy-success-icon" style={{
      marginLeft: '0px',
      verticalAlign: 'middle',
      display: 'inline-block'
    }}>
                          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg> : <Icon icon="copy" size="11" iconType="regular" aria-hidden="true" />}
                    </span>
                    <div id={\`copy-code-${property.name}-status\`} className="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
                  </span>

                  {property.json && isOpen && <button onClick={e => {
      e.stopPropagation();
      setVisibleJson(prev => ({
        ...prev,
        \[property.name\]: !prev\[property.name\]
      }));
    }} className={\`view-json-button ${selectedProperty === property.name || hoveredProperty === property.name ? 'selected' : ''}\`} type="button" aria-expanded={visibleJson\[property.name\] || false} style={{
      marginLeft: 'auto'
    }}>
                      <Icon icon="code" size="14" iconType="regular" aria-hidden="true" /> {visibleJson\[property.name\] ? 'Hide JSON' : 'Show JSON'}
                    </button>}
                </div>
              </dt>\];
    if (isOpen) {
      elements.push(<dd key={\`dd-${property.name}\`} className="property-definition-description" onMouseEnter={() => setHoveredProperty(property.name)} onMouseLeave={() => setHoveredProperty(null)}>
                  <div className="property-definition-row">
                    <span className="property-data-type" style={{
        backgroundColor: \`unset\`
      }}><strong>Data type: </strong> {formatDataType(property.type)}</span>
                    <span className="property-field-type">
                    <strong>Display type: </strong> {fieldTypeConfig.icon}
                      <span>{fieldTypeConfig.label}</span>
                    </span>
                  </div>

                  <div className="property-definition-row property-description-text">
                    {property.description}
                  </div>

                  {property.options && property.options.length > 0 && <div className="property-definition-row">
                      {property.options.length > 10 ? <Expandable title={\`${property.options.length} options\`}>
                          <ul className="property-options-list">
                            {property.options.map((option, idx) => <li key={idx}>
                                {option.label} (<code>{option.value}</code>)
                              </li>)}
                          </ul>
                        </Expandable> : <ul className="property-options-list">
                          {property.options.map((option, idx) => <li key={idx}>
                              {option.label} (<code>{option.value}</code>)
                            </li>)}
                        </ul>}
                    </div>}

                  {(property.required || property.searchable || property.primaryDisplayProperty || property.secondaryDisplayProperty) && <div className="property-definition-row property-attributes">
                      {property.required && <span className="property-attribute">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
        marginLeft: '6px',
        verticalAlign: 'middle',
        display: 'inline-block'
      }}>
                            <path d="M12.7396 9.73875L7.99713 7L12.7396 4.26125C12.9803 4.12125 13.059 3.81938 12.9234 3.57875C12.7834 3.33813 12.4771 3.25938 12.2409 3.395L7.49838 6.13375V0.49875C7.49838 0.366473 7.44583 0.239614 7.3523 0.14608C7.25876 0.0525467 7.1319 0 6.99963 0C6.86735 0 6.74049 0.0525467 6.64696 0.14608C6.55342 0.239614 6.50088 0.366473 6.50088 0.49875V6.13375L1.75838 3.395C1.51775 3.255 1.2115 3.33813 1.07588 3.57875C0.935876 3.81938 1.019 4.12562 1.25963 4.26125L6.00213 7L1.25963 9.73875C1.019 9.87875 0.940251 10.1806 1.07588 10.4212C1.16775 10.5831 1.33838 10.6706 1.509 10.6706C1.59213 10.6706 1.67963 10.6487 1.75838 10.605L6.50088 7.86625V13.5013C6.50088 13.6335 6.55342 13.7604 6.64696 13.8539C6.74049 13.9475 6.86735 14 6.99963 14C7.1319 14 7.25876 13.9475 7.3523 13.8539C7.44583 13.7604 7.49838 13.6335 7.49838 13.5013V7.86625L12.2409 10.605C12.3196 10.6487 12.4071 10.6706 12.4903 10.6706C12.6609 10.6706 12.8315 10.5787 12.9234 10.4212C13.0634 10.1806 12.9803 9.87438 12.7396 9.73875Z" fill="currentColor"></path>
                          </svg>
                          <Tooltip tip={\`This property is required for creating ${objectPluralName.toLowerCase()}.\`}>Required</Tooltip>
                        </span>}
                      {property.searchable && <span className="property-attribute">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <Tooltip tip={\`This property can be used to search for ${objectPluralName.toLowerCase()}.\`} cta="Learn more about CRM search" href="/api-reference/search/guide">Searchable</Tooltip>
                        </span>}
                      {property.primaryDisplayProperty && <span className="property-attribute">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4.50266 12.9982C4.22703 12.9982 4.00391 12.7751 4.00391 12.4995V5.0007C4.00391 4.86843 4.05645 4.74157 4.14999 4.64803C4.24352 4.5545 4.37038 4.50195 4.50266 4.50195C4.63493 4.50195 4.76179 4.5545 4.85533 4.64803C4.94886 4.74157 5.00141 4.86843 5.00141 5.0007V12.4995C5.00141 12.7751 4.77828 12.9982 4.50266 12.9982Z" fill="currentColor" />
                          <path d="M12.4995 5.49945H1.5007C1.36843 5.49945 1.24157 5.44691 1.14803 5.35337C1.0545 5.25984 1.00195 5.13298 1.00195 5.0007C1.00195 4.86843 1.0545 4.74157 1.14803 4.64803C1.24157 4.5545 1.36843 4.50195 1.5007 4.50195H12.4995C12.6317 4.50195 12.7586 4.5545 12.8521 4.64803C12.9457 4.74157 12.9982 4.86843 12.9982 5.0007C12.9982 5.13298 12.9457 5.25984 12.8521 5.35337C12.7586 5.44691 12.6317 5.49945 12.4995 5.49945Z" fill="currentColor" />
                          <path d="M11.5024 12.9982H2.49867C1.6718 12.9982 0.998047 12.3244 0.998047 11.4976V2.49818C0.998047 1.67131 1.6718 0.997559 2.49867 0.997559H11.498C12.3249 0.997559 12.9987 1.67131 12.9987 2.49818V11.4976C12.9987 12.3244 12.3249 12.9982 11.498 12.9982H11.5024ZM2.49867 1.99943C2.22305 1.99943 1.99992 2.22256 1.99992 2.49818V11.4976C1.99992 11.7732 2.22305 11.9963 2.49867 11.9963H11.498C11.7737 11.9963 11.9968 11.7732 11.9968 11.4976V2.49818C11.9968 2.22256 11.7737 1.99943 11.498 1.99943H2.49867Z" fill="currentColor" />
                          </svg>
                          <Tooltip tip={\`The main display label in the UI for ${objectPluralName.toLowerCase()}.\`}>Primary display property</Tooltip>
                        </span>}
                      {property.secondaryDisplayProperty && <span className="property-attribute">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4.50266 12.9982C4.22703 12.9982 4.00391 12.7751 4.00391 12.4995V5.0007C4.00391 4.86843 4.05645 4.74157 4.14999 4.64803C4.24352 4.5545 4.37038 4.50195 4.50266 4.50195C4.63493 4.50195 4.76179 4.5545 4.85533 4.64803C4.94886 4.74157 5.00141 4.86843 5.00141 5.0007V12.4995C5.00141 12.7751 4.77828 12.9982 4.50266 12.9982Z" fill="currentColor" />
                          <path d="M12.4995 5.49945H1.5007C1.36843 5.49945 1.24157 5.44691 1.14803 5.35337C1.0545 5.25984 1.00195 5.13298 1.00195 5.0007C1.00195 4.86843 1.0545 4.74157 1.14803 4.64803C1.24157 4.5545 1.36843 4.50195 1.5007 4.50195H12.4995C12.6317 4.50195 12.7586 4.5545 12.8521 4.64803C12.9457 4.74157 12.9982 4.86843 12.9982 5.0007C12.9982 5.13298 12.9457 5.25984 12.8521 5.35337C12.7586 5.44691 12.6317 5.49945 12.4995 5.49945Z" fill="currentColor" />
                          <path d="M11.5024 12.9982H2.49867C1.6718 12.9982 0.998047 12.3244 0.998047 11.4976V2.49818C0.998047 1.67131 1.6718 0.997559 2.49867 0.997559H11.498C12.3249 0.997559 12.9987 1.67131 12.9987 2.49818V11.4976C12.9987 12.3244 12.3249 12.9982 11.498 12.9982H11.5024ZM2.49867 1.99943C2.22305 1.99943 1.99992 2.22256 1.99992 2.49818V11.4976C1.99992 11.7732 2.22305 11.9963 2.49867 11.9963H11.498C11.7737 11.9963 11.9968 11.7732 11.9968 11.4976V2.49818C11.9968 2.22256 11.7737 1.99943 11.498 1.99943H2.49867Z" fill="currentColor" />
                          </svg>
                          <Tooltip tip={\`A secondary label in the UI for ${objectPluralName.toLowerCase()}.\`}>Secondary display property</Tooltip>
                        </span>}
                    </div>}

                  {property.json && visibleJson\[property.name\] && <div className="property-json-viewer" style={{
        marginTop: '1rem'
      }}>
                      <CodeBlock language="json">
                      {JSON.stringify(property.json, null, 2)}
                      </CodeBlock>
                    </div>}
                </dd>);
    }
    return elements;
  }) : <div className="property-definitions-empty">
            {!debouncedSearchTerm.trim() && (selectedType !== 'all' || selectedFieldType !== 'all' || selectedAttribute !== 'all') ? 'No properties found matching the selected filters.' : \`No properties found matching "${searchTerm}"\`}
          </div>}
      </dl>
    </div>;
};

export const CopyCode = ({children, className = ""}) => {
  const componentId = \`copy-code-${Date.now()}-${Math.floor(Math.random() \* 1000)}\`;
  const statusId = \`${componentId}-status\`;
  const \[isCopied, setIsCopied\] = useState(false);
  const getTextContent = element => {
    if (typeof element === 'string' || typeof element === 'number') {
      return String(element);
    }
    if (element && typeof element === 'object' && element.props) {
      return element.props.children || '';
    }
    if (Array.isArray(element)) {
      return element.map(getTextContent).join('');
    }
    return String(element);
  };
  const textContent = getTextContent(children);
  const handleCopy = async event => {
    try {
      await navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      const status = document.getElementById(statusId);
      if (status) {
        status.textContent = 'Code copied to clipboard';
      }
      setTimeout(() => {
        setIsCopied(false);
        const status = document.getElementById(statusId);
        if (status) {
          status.textContent = '';
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      const status = document.getElementById(statusId);
      if (status) {
        status.textContent = 'Failed to copy code';
      }
    }
  };
  const handleKeyDown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy(event);
    }
  };
  return <span id={componentId} className={\`copy-code${className ? \` ${className}\` : ''}\`}>
      <span className="code-text" onClick={handleCopy} onKeyDown={handleKeyDown} style={{
    cursor: 'pointer'
  }} role="button" tabIndex={0} aria-label={isCopied ? 'Code copied to clipboard' : 'Copy code to clipboard'}>
        {children}
        {isCopied ? <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="copy-success-icon" style={{
    marginLeft: '0px',
    verticalAlign: 'middle',
    display: 'inline-block'
  }}>
            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg> : <Icon icon="copy" size="11" iconType="regular" aria-hidden="true" />}
      </span>

      <div id={statusId} className="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    </span>;
};

export const ObjectSummaryCard = ({objectName, singularName, pluralName, objectId, fullyQualifiedName, allowsCustomProperties, allowsSensitiveProperties, hasPipelines, description, requiredProperties = \[\], searchableProperties, primaryDisplayProperty, secondaryDisplayProperties, apiEndpoint, showProperties = true, children}) => {
  const \[isLoading, setIsLoading\] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, \[\]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "name": \`${objectName} Object\`,
    "about": \`HubSpot CRM ${objectName} Object\`,
    "description": description,
    "properties": {
      "objectId": objectId,
      "singularName": singularName,
      "pluralName": pluralName,
      "fullyQualifiedName": fullyQualifiedName,
      "allowsCustomProperties": allowsCustomProperties,
      "allowsSensitiveProperties": allowsSensitiveProperties,
      "hasPipelines": hasPipelines,
      "requiredProperties": requiredProperties,
      "searchableProperties": searchableProperties,
      "primaryDisplayProperty": primaryDisplayProperty,
      "secondaryDisplayProperties": secondaryDisplayProperties,
      ...apiEndpoint && ({
        "apiEndpoint": apiEndpoint
      })
    }
  };
  const CheckIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#00A651" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
  const XIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 5L5 15M5 5L15 15" stroke="#C73A2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
  const normalizeProperty = prop => {
    if (typeof prop === 'string') {
      return {
        label: prop,
        name: prop
      };
    }
    return prop;
  };
  const PropertyTable = ({properties, showNoneMessage = false}) => {
    const propsArray = Array.isArray(properties) ? properties : \[properties\];
    const filteredProps = propsArray.filter(prop => {
      if (typeof prop === 'string') return prop.trim().length > 0;
      if (typeof prop === 'object' && prop !== null) {
        return prop.label || prop.name;
      }
      return false;
    });
    const handlePropertyClick = (e, propertyName) => {
      e.preventDefault();
      const targetElement = document.getElementById(propertyName);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        window.location.hash = propertyName;
        setTimeout(() => {
          targetElement.focus({
            preventScroll: true
          });
        }, 500);
      } else {
        window.location.hash = propertyName;
        const checkAndScroll = (attempts = 0, maxAttempts = 20) => {
          const element = document.getElementById(propertyName);
          if (element) {
            setTimeout(() => {
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
              setTimeout(() => {
                element.focus({
                  preventScroll: true
                });
              }, 500);
            }, 150);
          } else if (attempts < maxAttempts) {
            setTimeout(() => checkAndScroll(attempts + 1, maxAttempts), 100);
          }
        };
        setTimeout(() => checkAndScroll(), 100);
      }
    };
    if (filteredProps.length === 0) {
      return showNoneMessage ? <span>None</span> : null;
    }
    return <table className="property-summary-table">
        <caption className="sr-only">Properties list</caption>
        <thead>
          <tr>
            <th>Label</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {filteredProps.map((prop, idx) => {
      const {label, name} = normalizeProperty(prop);
      return <tr key={name || idx}>
                <td>
                  <a href={\`#${name}\`} className="property-table-link" onClick={e => handlePropertyClick(e, name)}>
                    {label}
                  </a>
                </td>
                <td>
                  <code>{name}</code>
                </td>
              </tr>;
    })}
        </tbody>
      </table>;
  };
  if (isLoading) {
    return <Card>
        <div className="object-summary-card skeleton-loader" role="region" aria-label="Loading object summary" aria-busy="true">
          <div className="summary-row title-row" style={{
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
            <div style={{
      width: '60%',
      height: '20px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px'
    }}></div>
          </div>
          <div className="summary-row header-row" style={{
      animation: 'pulse 1.5s ease-in-out infinite',
      animationDelay: '0.1s'
    }}>
            <div style={{
      width: '30%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px'
    }}></div>
            <div style={{
      width: '40%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px'
    }}></div>
            <div style={{
      width: '35%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px'
    }}></div>
          </div>
          <div className="summary-row" style={{
      animation: 'pulse 1.5s ease-in-out infinite',
      animationDelay: '0.2s'
    }}>
            <div style={{
      width: '45%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px'
    }}></div>
            <div style={{
      width: '50%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px'
    }}></div>
            <div style={{
      width: '48%',
      height: '16px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px'
    }}></div>
          </div>
          {showProperties && <div style={{
      marginTop: '16px',
      animation: 'pulse 1.5s ease-in-out infinite',
      animationDelay: '0.3s'
    }}>
              <div style={{
      width: '80%',
      height: '100px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px'
    }}></div>
            </div>}
        </div>
        <style>{\`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        \`}</style>
      </Card>;
  }
  return <>
      {}
      {}
      <div className="object-summary-card-container rounded-2xl border border-gray-950/10 dark:border-white/10 w-full">
        <div className="object-summary-card" data-object-type={singularName} data-object-id={objectId} data-allows-custom-properties={allowsCustomProperties} data-allows-sensitive-properties={allowsSensitiveProperties} data-has-pipelines={hasPipelines} role="region" aria-label={\`${objectName} object summary\`}>
        <h2 noAnchor>Overview</h2>
        <div className="summary-row title-row" data-section="title">
          <strong>{objectName}:</strong> {description}
        </div>

        <div className="summary-row header-row" data-section="identification">
          <div data-property="object-id">
            <strong>Object ID:</strong>
            <CopyCode><code>{objectId}</code></CopyCode>
          </div>
          <div data-property="api-names">
            <strong>Singular/plural:</strong>

            <div><span>{singularName}</span>/<span>{pluralName}</span></div>
          </div>
          <div data-property="fully-qualified-name">
            <strong>Fully qualified name (FQN):</strong>

            <CopyCode><code>{fullyQualifiedName}</code></CopyCode>
          </div>
        </div>

        <div className="summary-row" data-section="capabilities" role="list" aria-label="Object capabilities">
        {}
          {hasPipelines !== undefined && <div data-property="pipelines" data-value={hasPipelines} role="listitem">
              {hasPipelines ? <CheckIcon /> : <XIcon />}
              <span>{hasPipelines ? 'Has' : 'Doesn\\'t have'} pipelines</span>
            </div>}
          <div data-property="custom-properties" data-value={allowsCustomProperties} role="listitem">
            {allowsCustomProperties ? <CheckIcon /> : <XIcon />}
            <span>{allowsCustomProperties ? 'Allows' : 'Doesn\\'t allow'} custom properties</span>
          </div>
          <div data-property="sensitive-properties" data-value={allowsSensitiveProperties} role="listitem">
            {allowsSensitiveProperties ? <CheckIcon /> : <XIcon />}
            <span>{allowsSensitiveProperties ? 'Allows' : 'Doesn\\'t allow'} sensitive properties</span>
          </div>
        </div>

        <section className="object-properties-list" data-section="details" aria-label="Object details" style={{
    display: showProperties ? '' : 'none'
  }}><span data-as="p" class="summary-row-title">Attributes</span><br />
          <Tooltip tip={\`Properties required for creating a ${singularName.toLowerCase()}.\`}>
            <div className="object-property-label tooltip underline decoration-dotted decoration-2 underline-offset-4 decoration-gray-400 dark:decoration-gray-500">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
    marginLeft: '6px',
    verticalAlign: 'middle',
    display: 'inline-block'
  }}>
              <path d="M12.7396 9.73875L7.99713 7L12.7396 4.26125C12.9803 4.12125 13.059 3.81938 12.9234 3.57875C12.7834 3.33813 12.4771 3.25938 12.2409 3.395L7.49838 6.13375V0.49875C7.49838 0.366473 7.44583 0.239614 7.3523 0.14608C7.25876 0.0525467 7.1319 0 6.99963 0C6.86735 0 6.74049 0.0525467 6.64696 0.14608C6.55342 0.239614 6.50088 0.366473 6.50088 0.49875V6.13375L1.75838 3.395C1.51775 3.255 1.2115 3.33813 1.07588 3.57875C0.935876 3.81938 1.019 4.12562 1.25963 4.26125L6.00213 7L1.25963 9.73875C1.019 9.87875 0.940251 10.1806 1.07588 10.4212C1.16775 10.5831 1.33838 10.6706 1.509 10.6706C1.59213 10.6706 1.67963 10.6487 1.75838 10.605L6.50088 7.86625V13.5013C6.50088 13.6335 6.55342 13.7604 6.64696 13.8539C6.74049 13.9475 6.86735 14 6.99963 14C7.1319 14 7.25876 13.9475 7.3523 13.8539C7.44583 13.7604 7.49838 13.6335 7.49838 13.5013V7.86625L12.2409 10.605C12.3196 10.6487 12.4071 10.6706 12.4903 10.6706C12.6609 10.6706 12.8315 10.5787 12.9234 10.4212C13.0634 10.1806 12.9803 9.87438 12.7396 9.73875Z" fill="currentColor" />
              </svg>
               Required properties
            </div>
          </Tooltip>
          <div className="object-property-value">
            {requiredProperties.length > 0 ? <PropertyTable properties={requiredProperties} /> : 'None'}
          </div>

          <Tooltip tip={\`The main display label in the UI for ${pluralName.toLowerCase()}.\`}>
            <div className="object-property-label tooltip underline decoration-dotted decoration-2 underline-offset-4 decoration-gray-400 dark:decoration-gray-500">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
    marginLeft: '6px',
    verticalAlign: 'middle',
    display: 'inline-block'
  }}>
                <path d="M4.50266 12.9982C4.22703 12.9982 4.00391 12.7751 4.00391 12.4995V5.0007C4.00391 4.86843 4.05645 4.74157 4.14999 4.64803C4.24352 4.5545 4.37038 4.50195 4.50266 4.50195C4.63493 4.50195 4.76179 4.5545 4.85533 4.64803C4.94886 4.74157 5.00141 4.86843 5.00141 5.0007V12.4995C5.00141 12.7751 4.77828 12.9982 4.50266 12.9982Z" fill="currentColor" />
                <path d="M12.4995 5.49945H1.5007C1.36843 5.49945 1.24157 5.44691 1.14803 5.35337C1.0545 5.25984 1.00195 5.13298 1.00195 5.0007C1.00195 4.86843 1.0545 4.74157 1.14803 4.64803C1.24157 4.5545 1.36843 4.50195 1.5007 4.50195H12.4995C12.6317 4.50195 12.7586 4.5545 12.8521 4.64803C12.9457 4.74157 12.9982 4.86843 12.9982 5.0007C12.9982 5.13298 12.9457 5.25984 12.8521 5.35337C12.7586 5.44691 12.6317 5.49945 12.4995 5.49945Z" fill="currentColor" />
                <path d="M11.5024 12.9982H2.49867C1.6718 12.9982 0.998047 12.3244 0.998047 11.4976V2.49818C0.998047 1.67131 1.6718 0.997559 2.49867 0.997559H11.498C12.3249 0.997559 12.9987 1.67131 12.9987 2.49818V11.4976C12.9987 12.3244 12.3249 12.9982 11.498 12.9982H11.5024ZM2.49867 1.99943C2.22305 1.99943 1.99992 2.22256 1.99992 2.49818V11.4976C1.99992 11.7732 2.22305 11.9963 2.49867 11.9963H11.498C11.7737 11.9963 11.9968 11.7732 11.9968 11.4976V2.49818C11.9968 2.22256 11.7737 1.99943 11.498 1.99943H2.49867Z" fill="currentColor" />
              </svg>Primary display property
            </div>
          </Tooltip>
          <div className="object-property-value">
            <PropertyTable properties={primaryDisplayProperty} />
          </div>

          <Tooltip tip={\`Additional properties that are used as labels in the UI for ${pluralName.toLowerCase()}.\`}>
            <div className="object-property-label tooltip underline decoration-dotted decoration-2 underline-offset-4 decoration-gray-400 dark:decoration-gray-500">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
    marginLeft: '6px',
    verticalAlign: 'middle',
    display: 'inline-block'
  }}>
                <path d="M4.50266 12.9982C4.22703 12.9982 4.00391 12.7751 4.00391 12.4995V5.0007C4.00391 4.86843 4.05645 4.74157 4.14999 4.64803C4.24352 4.5545 4.37038 4.50195 4.50266 4.50195C4.63493 4.50195 4.76179 4.5545 4.85533 4.64803C4.94886 4.74157 5.00141 4.86843 5.00141 5.0007V12.4995C5.00141 12.7751 4.77828 12.9982 4.50266 12.9982Z" fill="currentColor" />
                <path d="M12.4995 5.49945H1.5007C1.36843 5.49945 1.24157 5.44691 1.14803 5.35337C1.0545 5.25984 1.00195 5.13298 1.00195 5.0007C1.00195 4.86843 1.0545 4.74157 1.14803 4.64803C1.24157 4.5545 1.36843 4.50195 1.5007 4.50195H12.4995C12.6317 4.50195 12.7586 4.5545 12.8521 4.64803C12.9457 4.74157 12.9982 4.86843 12.9982 5.0007C12.9982 5.13298 12.9457 5.25984 12.8521 5.35337C12.7586 5.44691 12.6317 5.49945 12.4995 5.49945Z" fill="currentColor" />
                <path d="M11.5024 12.9982H2.49867C1.6718 12.9982 0.998047 12.3244 0.998047 11.4976V2.49818C0.998047 1.67131 1.6718 0.997559 2.49867 0.997559H11.498C12.3249 0.997559 12.9987 1.67131 12.9987 2.49818V11.4976C12.9987 12.3244 12.3249 12.9982 11.498 12.9982H11.5024ZM2.49867 1.99943C2.22305 1.99943 1.99992 2.22256 1.99992 2.49818V11.4976C1.99992 11.7732 2.22305 11.9963 2.49867 11.9963H11.498C11.7737 11.9963 11.9968 11.7732 11.9968 11.4976V2.49818C11.9968 2.22256 11.7737 1.99943 11.498 1.99943H2.49867Z" fill="currentColor" />
              </svg>Secondary display properties
            </div>
          </Tooltip>
          <div className="object-property-value">
            <PropertyTable properties={secondaryDisplayProperties} />
          </div>

          <Tooltip tip={\`Properties that can be used to search for ${pluralName.toLowerCase()}.\`} cta="Learn more about CRM search" href="/api-reference/search/guide">
            <div className="object-property-label tooltip underline decoration-dotted decoration-2 underline-offset-4 decoration-gray-400 dark:decoration-gray-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
    marginLeft: '6px',
    verticalAlign: 'middle',
    display: 'inline-block'
  }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>Searchable properties
            </div>
          </Tooltip>
          <div className="object-property-value">
            <PropertyTable properties={searchableProperties} />
          </div>
        </section>

        {children && <div data-section="additional-content" className="additional-content">
            {children}
          </div>}
        </div>
      </div>
    </>;
};

<Warning>
  The following content is in beta, and may be subject to change. Currently, this content is available only for Contact, Company, Deal, and Ticket objects.
</Warning>

<ObjectSummaryCard
  objectName="Deal"
  singularName="Deal"
  pluralName="Deals"
  objectId="0-3"
  showProperties={true}
  fullyQualifiedName="DEAL"
  allowsCustomProperties={true}
  allowsSensitiveProperties={true}
  hasPipelines={true}
  description="Track progress, ownership, and other details on a transaction with a customer or company."
  requiredProperties={\[\]}
  primaryDisplayProperty={{label: "Deal Name", name: "dealname"}}
  secondaryDisplayProperties={\[
  {label: "Amount", name: "amount"},
  {label: "Deal Stage", name: "dealstage"},
  {label: "Close Date", name: "closedate"}
\]}
  searchableProperties={\[
  { label: "Pipeline", name: "pipeline" },
  { label: "Deal Name", name: "dealname" },
  { label: "Deal Stage", name: "dealstage" },
  { label: "Deal Description", name: "description" },
  { label: "Deal Type", name: "dealtype" }
\]}
>
  <h2 noAnchor>Default deal properties</h2>

  <p>Deal properties store information about individual deal records in your HubSpot CRM. Each property represents a specific data field (like deal name, amount, and close date) that can be set and updated for each deal in your database.</p>
  <p>The list below contains the default deal properties as of November 20, 2025. Note that your account's available properties may vary based on:</p>

  \* Your HubSpot subscription level and enabled features.
  \* Custom properties added by your organization.
  \* Account age (older accounts may have slightly different property variations).

  <p>To retrieve the complete list of deal properties available in your specific account, including any custom properties, make a \`GET\` request to \`/crm/v3/properties/deals\`. See the \[Properties API documentation\](/api-reference/crm-properties-v3/guide) for full details.</p>

  <PropertyDefinitions objectPluralName="deals" objectSingularName="deal" border={false} compact={true}>
    <Property
      name="amount"
      label="Amount"
      type="number"
      fieldType="number"
      description="The total amount of the deal"
      secondaryDisplayProperty={true}
      json={{
      "name": "amount",
      "label": "Amount",
      "type": "number",
      "fieldType": "number",
      "description": "The total amount of the deal",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": 2,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="amount\_in\_home\_currency"
      label="Amount in company currency"
      type="number"
      fieldType="calculation\_equation"
      description="The amount of the deal, using the exchange rate, in your company's currency"
      json={{
      "name": "amount\_in\_home\_currency",
      "label": "Amount in company currency",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "The amount of the deal, using the exchange rate, in your company's currency",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(hs\_exchange\_rate) then (amount \* hs\_exchange\_rate) else amount",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="closed\_lost\_reason"
      label="Closed Lost Reason"
      type="string"
      fieldType="textarea"
      description="Reason why this deal was lost"
      json={{
      "name": "closed\_lost\_reason",
      "label": "Closed Lost Reason",
      "type": "string",
      "fieldType": "textarea",
      "description": "Reason why this deal was lost",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 11,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": false,
        "readOnlyDefinition": false,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="closed\_won\_reason"
      label="Closed Won Reason"
      type="string"
      fieldType="textarea"
      description="Reason why this deal was won"
      json={{
      "name": "closed\_won\_reason",
      "label": "Closed Won Reason",
      "type": "string",
      "fieldType": "textarea",
      "description": "Reason why this deal was won",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 12,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": false,
        "readOnlyDefinition": false,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="closedate"
      label="Close Date"
      type="datetime"
      fieldType="date"
      description="Date the deal was closed. This property is set automatically by HubSpot."
      secondaryDisplayProperty={true}
      json={{
      "name": "closedate",
      "label": "Close Date",
      "type": "datetime",
      "fieldType": "date",
      "description": "Date the deal was closed. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 5,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="createdate"
      label="Create Date"
      type="datetime"
      fieldType="date"
      description="Date the deal was created. This property is set automatically by HubSpot."
      json={{
      "name": "createdate",
      "label": "Create Date",
      "type": "datetime",
      "fieldType": "date",
      "description": "Date the deal was created. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="days\_to\_close"
      label="Days to close"
      type="number"
      fieldType="calculation\_equation"
      description="The number of days the deal took to close"
      json={{
      "name": "days\_to\_close",
      "label": "Days to close",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "The number of days the deal took to close",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": false,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "max(0, round\_down(((closedate - createdate) / 86400000), 0))",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="deal\_currency\_code"
      label="Currency"
      type="enumeration"
      fieldType="select"
      description="Currency code for the deal."
      json={{
      "name": "deal\_currency\_code",
      "label": "Currency",
      "type": "enumeration",
      "fieldType": "select",
      "description": "Currency code for the deal.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="dealname"
      label="Deal Name"
      type="string"
      fieldType="text"
      description="The name given to this deal."
      primaryDisplayProperty={true}
      searchable={true}
      json={{
      "name": "dealname",
      "label": "Deal Name",
      "type": "string",
      "fieldType": "text",
      "description": "The name given to this deal.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 0,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="dealstage"
      label="Deal Stage"
      type="enumeration"
      fieldType="radio"
      description="The stage of the deal. Deal stages allow you to categorize and track the progress of the deals that you are working on."
      secondaryDisplayProperty={true}
      searchable={true}
      json={{
      "name": "dealstage",
      "label": "Deal Stage",
      "type": "enumeration",
      "fieldType": "radio",
      "description": "The stage of the deal. Deal stages allow you to categorize and track the progress of the deals that you are working on.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 3,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyOptions": false,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="dealtype"
      label="Deal Type"
      type="enumeration"
      fieldType="radio"
      description="The type of deal. By default, categorize your deal as either a New Business or Existing Business."
      searchable={true}
      options={\[
    { label: "New Business", value: "newbusiness" },
    { label: "Existing Business", value: "existingbusiness" }
  \]}
      json={{
      "name": "dealtype",
      "label": "Deal Type",
      "type": "enumeration",
      "fieldType": "radio",
      "description": "The type of deal. By default, categorize your deal as either a New Business or Existing Business.",
      "groupName": "dealinformation",
      "options": \[
        {
          "label": "New Business",
          "value": "newbusiness",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Existing Business",
          "value": "existingbusiness",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": 8,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyOptions": false,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="description"
      label="Deal Description"
      type="string"
      fieldType="textarea"
      description="Description of the deal"
      searchable={true}
      json={{
      "name": "description",
      "label": "Deal Description",
      "type": "string",
      "fieldType": "textarea",
      "description": "Description of the deal",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 9,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="engagements\_last\_meeting\_booked"
      label="Date of last meeting booked in meetings tool"
      type="datetime"
      fieldType="date"
      description="The date of the most recent meeting an associated contact has booked through the meetings tool."
      json={{
      "name": "engagements\_last\_meeting\_booked",
      "label": "Date of last meeting booked in meetings tool",
      "type": "datetime",
      "fieldType": "date",
      "description": "The date of the most recent meeting an associated contact has booked through the meetings tool.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="engagements\_last\_meeting\_booked\_campaign"
      label="Campaign of last booking in meetings tool"
      type="string"
      fieldType="text"
      description="This UTM parameter shows which marketing campaign (e.g. a specific email) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link."
      json={{
      "name": "engagements\_last\_meeting\_booked\_campaign",
      "label": "Campaign of last booking in meetings tool",
      "type": "string",
      "fieldType": "text",
      "description": "This UTM parameter shows which marketing campaign (e.g. a specific email) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="engagements\_last\_meeting\_booked\_medium"
      label="Medium of last booking in meetings tool"
      type="string"
      fieldType="text"
      description="This UTM parameter shows which channel (e.g. email) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link."
      json={{
      "name": "engagements\_last\_meeting\_booked\_medium",
      "label": "Medium of last booking in meetings tool",
      "type": "string",
      "fieldType": "text",
      "description": "This UTM parameter shows which channel (e.g. email) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="engagements\_last\_meeting\_booked\_source"
      label="Source of last booking in meetings tool"
      type="string"
      fieldType="text"
      description="This UTM parameter shows which site (e.g. Twitter) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link. "
      json={{
      "name": "engagements\_last\_meeting\_booked\_source",
      "label": "Source of last booking in meetings tool",
      "type": "string",
      "fieldType": "text",
      "description": "This UTM parameter shows which site (e.g. Twitter) referred an associated contact to the meetings tool for their most recent booking. This property is only populated when you add tracking parameters to your meeting link. ",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_actual\_duration"
      label="Actual duration"
      type="number"
      fieldType="calculation\_equation"
      description="Calculates the time between the create date and close date. If the create date occurs after the close date, the value returned is 0."
      json={{
      "name": "hs\_actual\_duration",
      "label": "Actual duration",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "Calculates the time between the create date and close date. If the create date occurs after the close date, the value returned is 0.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if createdate > closedate then 0 else time\_between(createdate, closedate)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_acv"
      label="Annual contract value"
      type="number"
      fieldType="number"
      description="The annual contract value (ACV) of this deal."
      json={{
      "name": "hs\_acv",
      "label": "Annual contract value",
      "type": "number",
      "fieldType": "number",
      "description": "The annual contract value (ACV) of this deal.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_all\_assigned\_business\_unit\_ids"
      label="Brands"
      type="enumeration"
      fieldType="checkbox"
      description="The brands this record is assigned to."
      json={{
      "name": "hs\_all\_assigned\_business\_unit\_ids",
      "label": "Brands",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "The brands this record is assigned to.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_all\_collaborator\_owner\_ids"
      label="Deal Collaborator"
      type="enumeration"
      fieldType="checkbox"
      description="Owner ids of the users involved in closing the deal"
      json={{
      "name": "hs\_all\_collaborator\_owner\_ids",
      "label": "Deal Collaborator",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "Owner ids of the users involved in closing the deal",
      "groupName": "dealinformation",
      "options": \[\],
      "referencedObjectType": "OWNER",
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_all\_deal\_split\_owner\_ids"
      label="Deal Split Users"
      type="enumeration"
      fieldType="checkbox"
      description="The owner ids of all associated Deal Splits. This property is set automatically by HubSpot."
      json={{
      "name": "hs\_all\_deal\_split\_owner\_ids",
      "label": "Deal Split Users",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "The owner ids of all associated Deal Splits. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_latest\_source"
      label="Latest Traffic Source"
      type="enumeration"
      fieldType="calculation\_equation"
      description="Source for the contact either directly or indirectly associated with the last session activity for this deal"
      options={\[
    { label: "Organic Search", value: "ORGANIC\_SEARCH" },
    { label: "Paid Search", value: "PAID\_SEARCH" },
    { label: "Email Marketing", value: "EMAIL\_MARKETING" },
    { label: "Organic Social", value: "SOCIAL\_MEDIA" },
    { label: "Referrals", value: "REFERRALS" },
    { label: "Other Campaigns", value: "OTHER\_CAMPAIGNS" },
    { label: "Direct Traffic", value: "DIRECT\_TRAFFIC" },
    { label: "Offline Sources", value: "OFFLINE" },
    { label: "Paid Social", value: "PAID\_SOCIAL" },
    { label: "AI Referrals", value: "AI\_REFERRALS" }
  \]}
      json={{
      "name": "hs\_analytics\_latest\_source",
      "label": "Latest Traffic Source",
      "type": "enumeration",
      "fieldType": "calculation\_equation",
      "description": "Source for the contact either directly or indirectly associated with the last session activity for this deal",
      "groupName": "analyticsinformation",
      "options": \[
        {
          "label": "Organic Search",
          "value": "ORGANIC\_SEARCH",
          "description": "",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Paid Search",
          "value": "PAID\_SEARCH",
          "description": "",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "Email Marketing",
          "value": "EMAIL\_MARKETING",
          "description": "",
          "displayOrder": 2,
          "hidden": false
        },
        {
          "label": "Organic Social",
          "value": "SOCIAL\_MEDIA",
          "description": "",
          "displayOrder": 3,
          "hidden": false
        },
        {
          "label": "Referrals",
          "value": "REFERRALS",
          "description": "",
          "displayOrder": 4,
          "hidden": false
        },
        {
          "label": "Other Campaigns",
          "value": "OTHER\_CAMPAIGNS",
          "description": "",
          "displayOrder": 5,
          "hidden": false
        },
        {
          "label": "Direct Traffic",
          "value": "DIRECT\_TRAFFIC",
          "description": "",
          "displayOrder": 6,
          "hidden": false
        },
        {
          "label": "Offline Sources",
          "value": "OFFLINE",
          "description": "",
          "displayOrder": 7,
          "hidden": false
        },
        {
          "label": "Paid Social",
          "value": "PAID\_SOCIAL",
          "description": "",
          "displayOrder": 8,
          "hidden": false
        },
        {
          "label": "AI Referrals",
          "value": "AI\_REFERRALS",
          "displayOrder": 9,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": false,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(string(hs\_analytics\_latest\_source\_contact)) then string(hs\_analytics\_latest\_source\_contact) else string(hs\_analytics\_latest\_source\_company)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_latest\_source\_data\_1"
      label="Latest Traffic Source Data 1"
      type="string"
      fieldType="text"
      description="Additional source details of the last session attributed to any contacts that are directly or indirectly associated with this deal"
      json={{
      "name": "hs\_analytics\_latest\_source\_data\_1",
      "label": "Latest Traffic Source Data 1",
      "type": "string",
      "fieldType": "text",
      "description": "Additional source details of the last session attributed to any contacts that are directly or indirectly associated with this deal",
      "groupName": "analyticsinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(string(hs\_analytics\_latest\_source\_contact)) then string(hs\_analytics\_latest\_source\_data\_1\_contact) else string(hs\_analytics\_latest\_source\_data\_1\_company)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_latest\_source\_data\_2"
      label="Latest Traffic Source Data 2"
      type="string"
      fieldType="text"
      description="Additional source details of the last session attributed to any contacts that are directly or indirectly associated with this deal"
      json={{
      "name": "hs\_analytics\_latest\_source\_data\_2",
      "label": "Latest Traffic Source Data 2",
      "type": "string",
      "fieldType": "text",
      "description": "Additional source details of the last session attributed to any contacts that are directly or indirectly associated with this deal",
      "groupName": "analyticsinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(string(hs\_analytics\_latest\_source\_contact)) then string(hs\_analytics\_latest\_source\_data\_2\_contact) else string(hs\_analytics\_latest\_source\_data\_2\_company)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_latest\_source\_timestamp"
      label="Latest Traffic Source Timestamp"
      type="datetime"
      fieldType="number"
      description="Timestamp of when latest source occurred for either a directly or indirectly associated contact"
      json={{
      "name": "hs\_analytics\_latest\_source\_timestamp",
      "label": "Latest Traffic Source Timestamp",
      "type": "datetime",
      "fieldType": "number",
      "description": "Timestamp of when latest source occurred for either a directly or indirectly associated contact",
      "groupName": "analyticsinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(string(hs\_analytics\_latest\_source\_contact)) then hs\_analytics\_latest\_source\_timestamp\_contact else hs\_analytics\_latest\_source\_timestamp\_company",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_source"
      label="Original Traffic Source"
      type="enumeration"
      fieldType="select"
      description="Original source for the contact with the earliest activity for this deal."
      options={\[
    { label: "Organic Search", value: "ORGANIC\_SEARCH" },
    { label: "Paid Search", value: "PAID\_SEARCH" },
    { label: "Email Marketing", value: "EMAIL\_MARKETING" },
    { label: "Organic Social", value: "SOCIAL\_MEDIA" },
    { label: "Referrals", value: "REFERRALS" },
    { label: "Other Campaigns", value: "OTHER\_CAMPAIGNS" },
    { label: "Direct Traffic", value: "DIRECT\_TRAFFIC" },
    { label: "Offline Sources", value: "OFFLINE" },
    { label: "Paid Social", value: "PAID\_SOCIAL" },
    { label: "AI Referrals", value: "AI\_REFERRALS" }
  \]}
      json={{
      "name": "hs\_analytics\_source",
      "label": "Original Traffic Source",
      "type": "enumeration",
      "fieldType": "select",
      "description": "Original source for the contact with the earliest activity for this deal.",
      "groupName": "analyticsinformation",
      "options": \[
        {
          "label": "Organic Search",
          "value": "ORGANIC\_SEARCH",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Paid Search",
          "value": "PAID\_SEARCH",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "Email Marketing",
          "value": "EMAIL\_MARKETING",
          "displayOrder": 2,
          "hidden": false
        },
        {
          "label": "Organic Social",
          "value": "SOCIAL\_MEDIA",
          "displayOrder": 3,
          "hidden": false
        },
        {
          "label": "Referrals",
          "value": "REFERRALS",
          "displayOrder": 4,
          "hidden": false
        },
        {
          "label": "Other Campaigns",
          "value": "OTHER\_CAMPAIGNS",
          "displayOrder": 5,
          "hidden": false
        },
        {
          "label": "Direct Traffic",
          "value": "DIRECT\_TRAFFIC",
          "displayOrder": 6,
          "hidden": false
        },
        {
          "label": "Offline Sources",
          "value": "OFFLINE",
          "displayOrder": 7,
          "hidden": false
        },
        {
          "label": "Paid Social",
          "value": "PAID\_SOCIAL",
          "displayOrder": 8,
          "hidden": false
        },
        {
          "label": "AI Referrals",
          "value": "AI\_REFERRALS",
          "displayOrder": 9,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyOptions": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_source\_data\_1"
      label="Original Traffic Source Drill-Down 1"
      type="string"
      fieldType="text"
      description="Additional information about the original source for the associated contact, or associated company if there is no contact, with the oldest value for the Time first seen property."
      json={{
      "name": "hs\_analytics\_source\_data\_1",
      "label": "Original Traffic Source Drill-Down 1",
      "type": "string",
      "fieldType": "text",
      "description": "Additional information about the original source for the associated contact, or associated company if there is no contact, with the oldest value for the Time first seen property.",
      "groupName": "analyticsinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_analytics\_source\_data\_2"
      label="Original Traffic Source Drill-Down 2"
      type="string"
      fieldType="text"
      description="Additional information about the original source for the associated contact, or associated company if there is no contact, with the oldest value for the Time first seen property."
      json={{
      "name": "hs\_analytics\_source\_data\_2",
      "label": "Original Traffic Source Drill-Down 2",
      "type": "string",
      "fieldType": "text",
      "description": "Additional information about the original source for the associated contact, or associated company if there is no contact, with the oldest value for the Time first seen property.",
      "groupName": "analyticsinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_arr"
      label="Annual recurring revenue"
      type="number"
      fieldType="number"
      description="The annual recurring revenue (ARR) of this deal."
      json={{
      "name": "hs\_arr",
      "label": "Annual recurring revenue",
      "type": "number",
      "fieldType": "number",
      "description": "The annual recurring revenue (ARR) of this deal.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_associated\_deal\_registration\_deal\_type"
      label="Associated Shared Deal Type"
      type="enumeration"
      fieldType="select"
      description="The deal type of the associated Shared Deal. (This field is only accurate on Partner portals!)"
      options={\[
    { label: "Channel", value: "CHANNEL" },
    { label: "Best Partner Wins", value: "BEST\_PARTNER\_WINS" },
    { label: "Partner Assisted", value: "DIFM" },
    { label: "Partner Sourced", value: "COLLAB" },
    { label: "Partner Sourced or Assisted", value: "COLLAB\_OR\_DIFM" }
  \]}
      json={{
      "name": "hs\_associated\_deal\_registration\_deal\_type",
      "label": "Associated Shared Deal Type",
      "type": "enumeration",
      "fieldType": "select",
      "description": "The deal type of the associated Shared Deal. (This field is only accurate on Partner portals!)",
      "groupName": "deal\_activity",
      "options": \[
        {
          "label": "Channel",
          "value": "CHANNEL",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Best Partner Wins",
          "value": "BEST\_PARTNER\_WINS",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "Partner Assisted",
          "value": "DIFM",
          "displayOrder": 2,
          "hidden": false
        },
        {
          "label": "Partner Sourced",
          "value": "COLLAB",
          "displayOrder": 3,
          "hidden": false
        },
        {
          "label": "Partner Sourced or Assisted",
          "value": "COLLAB\_OR\_DIFM",
          "displayOrder": 4,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_associated\_deal\_registration\_product\_interests"
      label="Associated Shared Deal Product Interests"
      type="enumeration"
      fieldType="checkbox"
      description="The most likely HubSpot product(s) of the deal synced from the associated Shared Deal. (This field is only accurate on Partner portals!)"
      options={\[
    { label: "Additional Portal", value: "Additional Portal" },
    { label: "Ads Add-On", value: "Ads Add-On" },
    { label: "Brand Domain", value: "Brand Domain" },
    { label: "Calculated Properties Limit Increase", value: "Calculated Properties Limit Increase" },
    { label: "Content Hub Enterprise", value: "Content Hub Enterprise" },
    { label: "Content Hub Professional", value: "Content Hub Professional" },
    { label: "Content Hub Starter", value: "Content Hub Starter" },
    { label: "CMS Enterprise", value: "CMS Enterprise" },
    { label: "CMS Professional", value: "CMS Professional" },
    { label: "CMS Starter", value: "HubSpot CMS" },
    { label: "CRM Contact Records Limit Increase", value: "CRM Contact Records Limit Increase" },
    { label: "CRM Object Limit Increase", value: "CRM Object Limit Increase" },
    { label: "CRM Suite Enterprise", value: "CRM Suite Enterprise" },
    { label: "CRM Suite Professional", value: "CRM Suite Professional" },
    { label: "CRM Suite Starter", value: "CRM Suite Starter" },
    { label: "Custom Properties Limit Increase", value: "Custom Properties Limit Increase" },
    { label: "Custom SSL", value: "Custom SSL" },
    { label: "Dedicated IP", value: "Dedicated IP" },
    { label: "Marketing+ Enterprise", value: "Marketing+ Enterprise" },
    { label: "Marketing+ Professional", value: "Marketing+ Professional" },
    { label: "Marketing Hub Enterprise", value: "Marketing Hub Enterprise" },
    { label: "Marketing Hub Professional", value: "Marketing Hub Professional" },
    { label: "Marketing Hub Starter", value: "Marketing Hub Starter" },
    { label: "Marketing SMS Add-On", value: "Marketing SMS Add-On" },
    { label: "Marketing SMS Limit Increase", value: "Marketing SMS Limit Increase" },
    { label: "Monthly Consulting", value: "Monthly Consulting" },
    { label: "Ongoing Consulting", value: "Ongoing Consulting" },
    { label: "Operations Hub Enterprise", value: "Operations Hub Enterprise" },
    { label: "Operations Hub Professional", value: "Operations Hub Professional" },
    { label: "Operations Hub Starter", value: "Operations Hub Starter" },
    { label: "Premium Consulting", value: "Premium Consulting" },
    { label: "Reporting Add-On", value: "Reporting Add-On" },
    { label: "Sales Hub Enterprise", value: "Sales Hub Enterprise" },
    { label: "Sales Hub Professional", value: "Sales Hub Professional" },
    { label: "Sales Hub Starter", value: "Sales Hub Starter" },
    { label: "Service Hub Enterprise", value: "Service Hub Enterprise" },
    { label: "Service Hub Professional", value: "Service Hub Professional" },
    { label: "Service Hub Starter", value: "Service Hub Starter" },
    { label: "Solutions Partner", value: "Solutions Partner" },
    { label: "Solutions Provider", value: "Solutions Provider" },
    { label: "Technical Consulting", value: "Technical Consulting" },
    { label: "Transactional Email", value: "Transactional Email" },
    { label: "100 Breeze Intelligence Credits", value: "100 Breeze Intelligence Credits" },
    { label: "1000 Breeze Intelligence Credits", value: "1000 Breeze Intelligence Credits" },
    { label: "10000 Breeze Intelligence Credits", value: "10000 Breeze Intelligence Credits" },
    { label: "Breeze Intelligence Backfill Enrichment", value: "Breeze Intelligence Backfill Enrichment" },
    { label: "Smart CRM Professional", value: "Smart CRM Professional" },
    { label: "Smart CRM Enterprise", value: "Smart CRM Enterprise" },
    { label: "HubSpot Committed Credits (Auto-upgrade)", value: "HubSpot Committed Credits (Auto-upgrade)" },
    { label: "Starter Customer Platform", value: "Starter Customer Platform" },
    { label: "Professional Customer Platform", value: "Professional Customer Platform" },
    { label: "Enterprise Customer Platform", value: "Enterprise Customer Platform" },
    { label: "Core Seats Starter", value: "Core Seats Starter" },
    { label: "Core Seats Professional", value: "Core Seats Professional" },
    { label: "Core Seats Enterprise", value: "Core Seats Enterprise" },
    { label: "Data Hub Starter", value: "Data Hub Starter" },
    { label: "Data Hub Professional", value: "Data Hub Professional" },
    { label: "Data Hub Enterprise", value: "Data Hub Enterprise" },
    { label: "Commerce Hub Starter", value: "Commerce Hub Starter" },
    { label: "Commerce Hub Professional", value: "Commerce Hub Professional" },
    { label: "Commerce Hub Enterprise", value: "Commerce Hub Enterprise" },
    { label: "HubSpot Credits Capacity Packs", value: "HubSpot Credits Capacity Packs" }
  \]}
      json={{
      "name": "hs\_associated\_deal\_registration\_product\_interests",
      "label": "Associated Shared Deal Product Interests",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "The most likely HubSpot product(s) of the deal synced from the associated Shared Deal. (This field is only accurate on Partner portals!)",
      "groupName": "deal\_activity",
      "options": \[
        {
          "label": "Additional Portal",
          "value": "Additional Portal",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Ads Add-On",
          "value": "Ads Add-On",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "Brand Domain",
          "value": "Brand Domain",
          "displayOrder": 2,
          "hidden": false
        },
        {
          "label": "Calculated Properties Limit Increase",
          "value": "Calculated Properties Limit Increase",
          "displayOrder": 3,
          "hidden": false
        },
        {
          "label": "Content Hub Enterprise",
          "value": "Content Hub Enterprise",
          "displayOrder": 4,
          "hidden": false
        },
        {
          "label": "Content Hub Professional",
          "value": "Content Hub Professional",
          "displayOrder": 5,
          "hidden": false
        },
        {
          "label": "Content Hub Starter",
          "value": "Content Hub Starter",
          "displayOrder": 6,
          "hidden": false
        },
        {
          "label": "CMS Enterprise",
          "value": "CMS Enterprise",
          "displayOrder": 7,
          "hidden": false
        },
        {
          "label": "CMS Professional",
          "value": "CMS Professional",
          "displayOrder": 8,
          "hidden": false
        },
        {
          "label": "CMS Starter",
          "value": "HubSpot CMS",
          "displayOrder": 9,
          "hidden": false
        },
        {
          "label": "CRM Contact Records Limit Increase",
          "value": "CRM Contact Records Limit Increase",
          "displayOrder": 10,
          "hidden": false
        },
        {
          "label": "CRM Object Limit Increase",
          "value": "CRM Object Limit Increase",
          "displayOrder": 11,
          "hidden": false
        },
        {
          "label": "CRM Suite Enterprise",
          "value": "CRM Suite Enterprise",
          "displayOrder": 12,
          "hidden": false
        },
        {
          "label": "CRM Suite Professional",
          "value": "CRM Suite Professional",
          "displayOrder": 13,
          "hidden": false
        },
        {
          "label": "CRM Suite Starter",
          "value": "CRM Suite Starter",
          "displayOrder": 14,
          "hidden": false
        },
        {
          "label": "Custom Properties Limit Increase",
          "value": "Custom Properties Limit Increase",
          "displayOrder": 15,
          "hidden": false
        },
        {
          "label": "Custom SSL",
          "value": "Custom SSL",
          "displayOrder": 16,
          "hidden": false
        },
        {
          "label": "Dedicated IP",
          "value": "Dedicated IP",
          "displayOrder": 17,
          "hidden": false
        },
        {
          "label": "Marketing+ Enterprise",
          "value": "Marketing+ Enterprise",
          "displayOrder": 18,
          "hidden": false
        },
        {
          "label": "Marketing+ Professional",
          "value": "Marketing+ Professional",
          "displayOrder": 19,
          "hidden": false
        },
        {
          "label": "Marketing Hub Enterprise",
          "value": "Marketing Hub Enterprise",
          "displayOrder": 20,
          "hidden": false
        },
        {
          "label": "Marketing Hub Professional",
          "value": "Marketing Hub Professional",
          "displayOrder": 21,
          "hidden": false
        },
        {
          "label": "Marketing Hub Starter",
          "value": "Marketing Hub Starter",
          "displayOrder": 22,
          "hidden": false
        },
        {
          "label": "Marketing SMS Add-On",
          "value": "Marketing SMS Add-On",
          "displayOrder": 23,
          "hidden": false
        },
        {
          "label": "Marketing SMS Limit Increase",
          "value": "Marketing SMS Limit Increase",
          "displayOrder": 24,
          "hidden": false
        },
        {
          "label": "Monthly Consulting",
          "value": "Monthly Consulting",
          "displayOrder": 25,
          "hidden": false
        },
        {
          "label": "Ongoing Consulting",
          "value": "Ongoing Consulting",
          "displayOrder": 26,
          "hidden": false
        },
        {
          "label": "Operations Hub Enterprise",
          "value": "Operations Hub Enterprise",
          "displayOrder": 27,
          "hidden": false
        },
        {
          "label": "Operations Hub Professional",
          "value": "Operations Hub Professional",
          "displayOrder": 28,
          "hidden": false
        },
        {
          "label": "Operations Hub Starter",
          "value": "Operations Hub Starter",
          "displayOrder": 29,
          "hidden": false
        },
        {
          "label": "Premium Consulting",
          "value": "Premium Consulting",
          "displayOrder": 30,
          "hidden": false
        },
        {
          "label": "Reporting Add-On",
          "value": "Reporting Add-On",
          "displayOrder": 31,
          "hidden": false
        },
        {
          "label": "Sales Hub Enterprise",
          "value": "Sales Hub Enterprise",
          "displayOrder": 32,
          "hidden": false
        },
        {
          "label": "Sales Hub Professional",
          "value": "Sales Hub Professional",
          "displayOrder": 33,
          "hidden": false
        },
        {
          "label": "Sales Hub Starter",
          "value": "Sales Hub Starter",
          "displayOrder": 34,
          "hidden": false
        },
        {
          "label": "Service Hub Enterprise",
          "value": "Service Hub Enterprise",
          "displayOrder": 35,
          "hidden": false
        },
        {
          "label": "Service Hub Professional",
          "value": "Service Hub Professional",
          "displayOrder": 36,
          "hidden": false
        },
        {
          "label": "Service Hub Starter",
          "value": "Service Hub Starter",
          "displayOrder": 37,
          "hidden": false
        },
        {
          "label": "Solutions Partner",
          "value": "Solutions Partner",
          "displayOrder": 38,
          "hidden": false
        },
        {
          "label": "Solutions Provider",
          "value": "Solutions Provider",
          "displayOrder": 39,
          "hidden": false
        },
        {
          "label": "Technical Consulting",
          "value": "Technical Consulting",
          "displayOrder": 40,
          "hidden": false
        },
        {
          "label": "Transactional Email",
          "value": "Transactional Email",
          "displayOrder": 41,
          "hidden": false
        },
        {
          "label": "100 Breeze Intelligence Credits",
          "value": "100 Breeze Intelligence Credits",
          "displayOrder": 42,
          "hidden": false
        },
        {
          "label": "1000 Breeze Intelligence Credits",
          "value": "1000 Breeze Intelligence Credits",
          "displayOrder": 43,
          "hidden": false
        },
        {
          "label": "10000 Breeze Intelligence Credits",
          "value": "10000 Breeze Intelligence Credits",
          "displayOrder": 44,
          "hidden": false
        },
        {
          "label": "Breeze Intelligence Backfill Enrichment",
          "value": "Breeze Intelligence Backfill Enrichment",
          "displayOrder": 45,
          "hidden": false
        },
        {
          "label": "Smart CRM Professional",
          "value": "Smart CRM Professional",
          "displayOrder": 46,
          "hidden": false
        },
        {
          "label": "Smart CRM Enterprise",
          "value": "Smart CRM Enterprise",
          "displayOrder": 47,
          "hidden": false
        },
        {
          "label": "HubSpot Committed Credits (Auto-upgrade)",
          "value": "HubSpot Committed Credits (Auto-upgrade)",
          "displayOrder": 48,
          "hidden": false
        },
        {
          "label": "Starter Customer Platform",
          "value": "Starter Customer Platform",
          "displayOrder": 49,
          "hidden": false
        },
        {
          "label": "Professional Customer Platform",
          "value": "Professional Customer Platform",
          "displayOrder": 50,
          "hidden": false
        },
        {
          "label": "Enterprise Customer Platform",
          "value": "Enterprise Customer Platform",
          "displayOrder": 51,
          "hidden": false
        },
        {
          "label": "Core Seats Starter",
          "value": "Core Seats Starter",
          "displayOrder": 54,
          "hidden": false
        },
        {
          "label": "Core Seats Professional",
          "value": "Core Seats Professional",
          "displayOrder": 55,
          "hidden": false
        },
        {
          "label": "Core Seats Enterprise",
          "value": "Core Seats Enterprise",
          "displayOrder": 56,
          "hidden": false
        },
        {
          "label": "Data Hub Starter",
          "value": "Data Hub Starter",
          "displayOrder": 57,
          "hidden": false
        },
        {
          "label": "Data Hub Professional",
          "value": "Data Hub Professional",
          "displayOrder": 58,
          "hidden": false
        },
        {
          "label": "Data Hub Enterprise",
          "value": "Data Hub Enterprise",
          "displayOrder": 59,
          "hidden": false
        },
        {
          "label": "Commerce Hub Starter",
          "value": "Commerce Hub Starter",
          "displayOrder": 60,
          "hidden": false
        },
        {
          "label": "Commerce Hub Professional",
          "value": "Commerce Hub Professional",
          "displayOrder": 61,
          "hidden": false
        },
        {
          "label": "Commerce Hub Enterprise",
          "value": "Commerce Hub Enterprise",
          "displayOrder": 62,
          "hidden": false
        },
        {
          "label": "HubSpot Credits Capacity Packs",
          "value": "HubSpot Credits Capacity Packs",
          "displayOrder": 63,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_average\_deal\_owner\_duration\_in\_current\_stage"
      label="Average Deal Owner Duration In Current Stage"
      type="number"
      fieldType="number"
      description="Time duration of the calculated average time of closed-won deals spent in current pipeline stage"
      json={{
      "name": "hs\_average\_deal\_owner\_duration\_in\_current\_stage",
      "label": "Average Deal Owner Duration In Current Stage",
      "type": "number",
      "fieldType": "number",
      "description": "Time duration of the calculated average time of closed-won deals spent in current pipeline stage",
      "groupName": "dealscripted",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_closed\_won\_count"
      label="Closed won count"
      type="number"
      fieldType="calculation\_equation"
      description="This property is 1 if the deal is closed won, otherwise 0."
      json={{
      "name": "hs\_closed\_won\_count",
      "label": "Closed won count",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "This property is 1 if the deal is closed won, otherwise 0.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if bool(hs\_is\_closed\_won) then 1 else 0",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_created\_by\_user\_id"
      label="Created by user ID"
      type="number"
      fieldType="number"
      description="The user who created this record. This value is set automatically by HubSpot."
      json={{
      "name": "hs\_created\_by\_user\_id",
      "label": "Created by user ID",
      "type": "number",
      "fieldType": "number",
      "description": "The user who created this record. This value is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_deal\_registration\_mrr"
      label="HubSpot Shared Deal MRR"
      type="number"
      fieldType="number"
      description="MRR of the quote purchased for this Shared Deal."
      json={{
      "name": "hs\_deal\_registration\_mrr",
      "label": "HubSpot Shared Deal MRR",
      "type": "number",
      "fieldType": "number",
      "description": "MRR of the quote purchased for this Shared Deal.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_deal\_registration\_mrr\_currency\_code"
      label="HubSpot Shared Deal MRR Currency Code"
      type="enumeration"
      fieldType="select"
      description="Currency code for the MRR of the quote purchased for this Shared Deal."
      json={{
      "name": "hs\_deal\_registration\_mrr\_currency\_code",
      "label": "HubSpot Shared Deal MRR Currency Code",
      "type": "enumeration",
      "fieldType": "select",
      "description": "Currency code for the MRR of the quote purchased for this Shared Deal.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": false,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_deal\_score"
      label="Deal Score"
      type="number"
      fieldType="number"
      description="The predictive deal score calculated by Hubspot AI to score the deal health"
      json={{
      "name": "hs\_deal\_score",
      "label": "Deal Score",
      "type": "number",
      "fieldType": "number",
      "description": "The predictive deal score calculated by Hubspot AI to score the deal health",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_deal\_stage\_probability"
      label="Deal probability"
      type="number"
      fieldType="number"
      description="The probability a deal will close. This defaults to the deal stage probability setting."
      json={{
      "name": "hs\_deal\_stage\_probability",
      "label": "Deal probability",
      "type": "number",
      "fieldType": "number",
      "description": "The probability a deal will close. This defaults to the deal stage probability setting.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": false,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_exchange\_rate"
      label="Exchange rate"
      type="number"
      fieldType="number"
      description="This is the exchange rate used to convert the deal amount into your company currency."
      json={{
      "name": "hs\_exchange\_rate",
      "label": "Exchange rate",
      "type": "number",
      "fieldType": "number",
      "description": "This is the exchange rate used to convert the deal amount into your company currency.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_forecast\_amount"
      label="Forecast amount"
      type="number"
      fieldType="number"
      description="The custom forecasted deal value calculated by multiplying the forecast probability and deal amount in your company’s currency."
      json={{
      "name": "hs\_forecast\_amount",
      "label": "Forecast amount",
      "type": "number",
      "fieldType": "number",
      "description": "The custom forecasted deal value calculated by multiplying the forecast probability and deal amount in your company’s currency.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if is\_present(hs\_forecast\_probability) then (hs\_forecast\_probability \* amount\_in\_home\_currency) else amount\_in\_home\_currency",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_forecast\_probability"
      label="Forecast probability"
      type="number"
      fieldType="number"
      description="The custom percent probability a deal will close."
      json={{
      "name": "hs\_forecast\_probability",
      "label": "Forecast probability",
      "type": "number",
      "fieldType": "number",
      "description": "The custom percent probability a deal will close.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_active\_shared\_deal"
      label="Is Active Shared Deal"
      type="bool"
      fieldType="booleancheckbox"
      description="Indicates if the current deal is an active shared deal. It is set automatically based on the value of hs\_num\_associated\_active\_deal\_registrations."
      options={\[
    { label: "Yes", value: "true" },
    { label: "No", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_active\_shared\_deal",
      "label": "Is Active Shared Deal",
      "type": "bool",
      "fieldType": "booleancheckbox",
      "description": "Indicates if the current deal is an active shared deal. It is set automatically based on the value of hs\_num\_associated\_active\_deal\_registrations.",
      "groupName": "deal\_activity",
      "options": \[
        {
          "label": "Yes",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "No",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_closed"
      label="Is Deal Closed?"
      type="bool"
      fieldType="calculation\_equation"
      description="True if the deal was won or lost."
      options={\[
    { label: "True", value: "true" },
    { label: "False", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_closed",
      "label": "Is Deal Closed?",
      "type": "bool",
      "fieldType": "calculation\_equation",
      "description": "True if the deal was won or lost.",
      "groupName": "dealinformation",
      "options": \[
        {
          "label": "True",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "False",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": false,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "(pipeline\_probability(string(dealstage)) <= 0 or pipeline\_probability(string(dealstage)) >= 1)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_closed\_count"
      label="Is Closed (numeric)"
      type="number"
      fieldType="calculation\_equation"
      description="This property is 1 if the deal is closed (&#x22;Closed Won&#x22; or &#x22;Closed Lost&#x22;), otherwise 0"
      json={{
      "name": "hs\_is\_closed\_count",
      "label": "Is Closed (numeric)",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "This property is 1 if the deal is closed (\\"Closed Won\\" or \\"Closed Lost\\"), otherwise 0",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if bool(hs\_is\_closed) then 1 else 0",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_closed\_lost"
      label="Is closed lost"
      type="bool"
      fieldType="calculation\_equation"
      description="True if the deal is in the closed lost state, false otherwise"
      options={\[
    { label: "True", value: "true" },
    { label: "False", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_closed\_lost",
      "label": "Is closed lost",
      "type": "bool",
      "fieldType": "calculation\_equation",
      "description": "True if the deal is in the closed lost state, false otherwise",
      "groupName": "deal\_activity",
      "options": \[
        {
          "label": "True",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "False",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if (is\_present(hs\_deal\_stage\_probability) and hs\_deal\_stage\_probability <= 0) then true else false",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_closed\_won"
      label="Is Closed Won"
      type="bool"
      fieldType="calculation\_equation"
      description="True if the deal is in the closed won state, false otherwise"
      options={\[
    { label: "True", value: "true" },
    { label: "False", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_closed\_won",
      "label": "Is Closed Won",
      "type": "bool",
      "fieldType": "calculation\_equation",
      "description": "True if the deal is in the closed won state, false otherwise",
      "groupName": "deal\_activity",
      "options": \[
        {
          "label": "True",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "False",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if (is\_present(pipeline\_probability(string(dealstage))) and pipeline\_probability(string(dealstage)) >= 1) then true else false",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_deal\_split"
      label="Deal Split Added"
      type="bool"
      fieldType="calculation\_equation"
      description="Indicates if the deal is split between multiple users."
      options={\[
    { label: "True", value: "true" },
    { label: "False", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_deal\_split",
      "label": "Deal Split Added",
      "type": "bool",
      "fieldType": "calculation\_equation",
      "description": "Indicates if the deal is split between multiple users.",
      "groupName": "dealinformation",
      "options": \[
        {
          "label": "True",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "False",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if (is\_present(hs\_num\_associated\_deal\_splits) and hs\_num\_associated\_deal\_splits > 1) then true else false",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_open\_count"
      label="Is Open (numeric)"
      type="number"
      fieldType="calculation\_equation"
      description="This property is 1 if the deal is not closed won or closed lost, otherwise 0"
      json={{
      "name": "hs\_is\_open\_count",
      "label": "Is Open (numeric)",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "This property is 1 if the deal is not closed won or closed lost, otherwise 0",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if bool(hs\_is\_closed) then 0 else 1",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_stalled"
      label="Is Stalled"
      type="bool"
      fieldType="calculation\_equation"
      description="True if Time in stage is 20% longer than the deal owner’s closed-won average time for that stage, false otherwise."
      options={\[
    { label: "true", value: "true" },
    { label: "false", value: "false" }
  \]}
      json={{
      "name": "hs\_is\_stalled",
      "label": "Is Stalled",
      "type": "bool",
      "fieldType": "calculation\_equation",
      "description": "True if Time in stage is 20% longer than the deal owner’s closed-won average time for that stage, false otherwise.",
      "groupName": "dealscripted",
      "options": \[
        {
          "label": "true",
          "value": "true",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "false",
          "value": "false",
          "displayOrder": 1,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_is\_stalled\_after\_timestamp"
      label="Is Stalled After Timestamp"
      type="datetime"
      fieldType="date"
      description="Timestamp when Time in stage became 20% longer than the deal owner’s closed-won average for that stage."
      json={{
      "name": "hs\_is\_stalled\_after\_timestamp",
      "label": "Is Stalled After Timestamp",
      "type": "datetime",
      "fieldType": "date",
      "description": "Timestamp when Time in stage became 20% longer than the deal owner’s closed-won average for that stage.",
      "groupName": "dealscripted",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_lastmodifieddate"
      label="Last Modified Date"
      type="datetime"
      fieldType="date"
      description="Most recent timestamp of any property update for this deal. This includes HubSpot internal properties, which can be visible or hidden. This property is updated automatically."
      json={{
      "name": "hs\_lastmodifieddate",
      "label": "Last Modified Date",
      "type": "datetime",
      "fieldType": "date",
      "description": "Most recent timestamp of any property update for this deal. This includes HubSpot internal properties, which can be visible or hidden. This property is updated automatically.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_latest\_approval\_status"
      label="Latest Approval Status"
      type="string"
      fieldType="text"
      description="The latest approval status. Used by HubSpot to track pipeline approval processes."
      json={{
      "name": "hs\_latest\_approval\_status",
      "label": "Latest Approval Status",
      "type": "string",
      "fieldType": "text",
      "description": "The latest approval status. Used by HubSpot to track pipeline approval processes.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_manual\_forecast\_category"
      label="Forecast category"
      type="enumeration"
      fieldType="select"
      description="The likelihood a deal will close. This property is used for manual forecasting your deals."
      options={\[
    { label: "Not forecasted", value: "OMIT" },
    { label: "Pipeline", value: "PIPELINE" },
    { label: "Best case", value: "BEST\_CASE" },
    { label: "Commit", value: "COMMIT" },
    { label: "Closed won", value: "CLOSED" }
  \]}
      json={{
      "name": "hs\_manual\_forecast\_category",
      "label": "Forecast category",
      "type": "enumeration",
      "fieldType": "select",
      "description": "The likelihood a deal will close. This property is used for manual forecasting your deals.",
      "groupName": "dealinformation",
      "options": \[
        {
          "label": "Not forecasted",
          "value": "OMIT",
          "description": "",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "Pipeline",
          "value": "PIPELINE",
          "description": "",
          "displayOrder": 2,
          "hidden": false
        },
        {
          "label": "Best case",
          "value": "BEST\_CASE",
          "description": "",
          "displayOrder": 3,
          "hidden": false
        },
        {
          "label": "Commit",
          "value": "COMMIT",
          "description": "",
          "displayOrder": 4,
          "hidden": false
        },
        {
          "label": "Closed won",
          "value": "CLOSED",
          "description": "",
          "displayOrder": 5,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyOptions": false,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_merged\_object\_ids"
      label="Merged Deal IDs"
      type="enumeration"
      fieldType="checkbox"
      description="The list of Deal record IDs that have been merged into this Deal. This value is set automatically by HubSpot."
      json={{
      "name": "hs\_merged\_object\_ids",
      "label": "Merged Deal IDs",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "The list of Deal record IDs that have been merged into this Deal. This value is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_mrr"
      label="Monthly recurring revenue"
      type="number"
      fieldType="number"
      description="The monthly recurring revenue (MRR) of this deal."
      json={{
      "name": "hs\_mrr",
      "label": "Monthly recurring revenue",
      "type": "number",
      "fieldType": "number",
      "description": "The monthly recurring revenue (MRR) of this deal.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_next\_meeting\_id"
      label="Next Meeting"
      type="number"
      fieldType="number"
      json={{
      "name": "hs\_next\_meeting\_id",
      "label": "Next Meeting",
      "type": "number",
      "fieldType": "number",
      "description": "",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_next\_meeting\_name"
      label="Next Meeting Name"
      type="string"
      fieldType="text"
      json={{
      "name": "hs\_next\_meeting\_name",
      "label": "Next Meeting Name",
      "type": "string",
      "fieldType": "text",
      "description": "",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_next\_meeting\_start\_time"
      label="Next Meeting Start Time"
      type="datetime"
      fieldType="date"
      json={{
      "name": "hs\_next\_meeting\_start\_time",
      "label": "Next Meeting Start Time",
      "type": "datetime",
      "fieldType": "date",
      "description": "",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_next\_step"
      label="Next step"
      type="string"
      fieldType="textarea"
      description="A short description of the next step for the deal"
      json={{
      "name": "hs\_next\_step",
      "label": "Next step",
      "type": "string",
      "fieldType": "textarea",
      "description": "A short description of the next step for the deal",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_notes\_next\_activity"
      label="Next Activity"
      type="object\_coordinates"
      fieldType="text"
      description="The coordinates of the next upcoming activity for a deal. This is set automatically by HubSpot based on user actions in the deal record."
      json={{
      "name": "hs\_notes\_next\_activity",
      "label": "Next Activity",
      "type": "object\_coordinates",
      "fieldType": "text",
      "description": "The coordinates of the next upcoming activity for a deal. This is set automatically by HubSpot based on user actions in the deal record.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_num\_associated\_active\_deal\_registrations"
      label="Number of Active Deal Registrations"
      type="number"
      fieldType="number"
      description="The number of active deal registrations associated with this deal. This property is set automatically by HubSpot."
      json={{
      "name": "hs\_num\_associated\_active\_deal\_registrations",
      "label": "Number of Active Deal Registrations",
      "type": "number",
      "fieldType": "number",
      "description": "The number of active deal registrations associated with this deal. This property is set automatically by HubSpot.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_num\_associated\_deal\_registrations"
      label="Number of Deal Registrations"
      type="number"
      fieldType="number"
      description="The number of deal registrations associated with this deal. This property is set automatically by HubSpot."
      json={{
      "name": "hs\_num\_associated\_deal\_registrations",
      "label": "Number of Deal Registrations",
      "type": "number",
      "fieldType": "number",
      "description": "The number of deal registrations associated with this deal. This property is set automatically by HubSpot.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_num\_of\_associated\_line\_items"
      label="Number of Associated Line Items"
      type="number"
      fieldType="number"
      description="The number of line items associated with this deal"
      json={{
      "name": "hs\_num\_of\_associated\_line\_items",
      "label": "Number of Associated Line Items",
      "type": "number",
      "fieldType": "number",
      "description": "The number of line items associated with this deal",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_object\_id"
      label="Record ID"
      type="number"
      fieldType="number"
      description="The unique ID for this record. This value is set automatically by HubSpot."
      json={{
      "name": "hs\_object\_id",
      "label": "Record ID",
      "type": "number",
      "fieldType": "number",
      "description": "The unique ID for this record. This value is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_object\_source\_detail\_1"
      label="Record source detail 1"
      type="string"
      fieldType="text"
      description="First level of detail on how this record was created."
      json={{
      "name": "hs\_object\_source\_detail\_1",
      "label": "Record source detail 1",
      "type": "string",
      "fieldType": "text",
      "description": "First level of detail on how this record was created.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_object\_source\_detail\_2"
      label="Record source detail 2"
      type="string"
      fieldType="text"
      description="Second level of detail on how this record was created."
      json={{
      "name": "hs\_object\_source\_detail\_2",
      "label": "Record source detail 2",
      "type": "string",
      "fieldType": "text",
      "description": "Second level of detail on how this record was created.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_object\_source\_detail\_3"
      label="Record source detail 3"
      type="string"
      fieldType="text"
      description="Third level of detail on how this record was created."
      json={{
      "name": "hs\_object\_source\_detail\_3",
      "label": "Record source detail 3",
      "type": "string",
      "fieldType": "text",
      "description": "Third level of detail on how this record was created.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_object\_source\_label"
      label="Record source"
      type="enumeration"
      fieldType="select"
      description="How this record was created."
      json={{
      "name": "hs\_object\_source\_label",
      "label": "Record source",
      "type": "enumeration",
      "fieldType": "select",
      "description": "How this record was created.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_priority"
      label="Priority"
      type="enumeration"
      fieldType="select"
      options={\[
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" }
  \]}
      json={{
      "name": "hs\_priority",
      "label": "Priority",
      "type": "enumeration",
      "fieldType": "select",
      "description": "",
      "groupName": "dealinformation",
      "options": \[
        {
          "label": "Low",
          "value": "low",
          "displayOrder": 0,
          "hidden": false
        },
        {
          "label": "Medium",
          "value": "medium",
          "displayOrder": 1,
          "hidden": false
        },
        {
          "label": "High",
          "value": "high",
          "displayOrder": 2,
          "hidden": false
        }
      \],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_projected\_amount"
      label="Weighted amount"
      type="number"
      fieldType="calculation\_equation"
      description="Returns the multiplication of the amount times the probability of the deal closing."
      json={{
      "name": "hs\_projected\_amount",
      "label": "Weighted amount",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "Returns the multiplication of the amount times the probability of the deal closing.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if (is\_present(hs\_deal\_stage\_probability) and hs\_deal\_stage\_probability >= 0) then (hs\_deal\_stage\_probability \* amount) else 0",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_projected\_amount\_in\_home\_currency"
      label="Weighted amount in company currency"
      type="number"
      fieldType="calculation\_equation"
      description="The deal’s amount in home currency multiplied by its probability of closing, which is determined based on the deal’s stage and the probability that was assigned to it in deal pipeline settings."
      json={{
      "name": "hs\_projected\_amount\_in\_home\_currency",
      "label": "Weighted amount in company currency",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "The deal’s amount in home currency multiplied by its probability of closing, which is determined based on the deal’s stage and the probability that was assigned to it in deal pipeline settings.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "if (is\_present(hs\_deal\_stage\_probability) and hs\_deal\_stage\_probability >= 0) then (hs\_deal\_stage\_probability \* amount\_in\_home\_currency) else 0",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_shared\_team\_ids"
      label="Shared teams"
      type="enumeration"
      fieldType="checkbox"
      description="Additional teams whose users can access the Deal based on their permissions. This can be set manually or through Workflows or APIs."
      json={{
      "name": "hs\_shared\_team\_ids",
      "label": "Shared teams",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "Additional teams whose users can access the Deal based on their permissions. This can be set manually or through Workflows or APIs.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_shared\_user\_ids"
      label="Shared users"
      type="enumeration"
      fieldType="checkbox"
      description="Additional users that can access the Deal based on their permissions. This can be set manually or through Workflows and APIs."
      json={{
      "name": "hs\_shared\_user\_ids",
      "label": "Shared users",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "Additional users that can access the Deal based on their permissions. This can be set manually or through Workflows and APIs.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_synced\_deal\_owner\_name\_and\_email"
      label="HubSpot Sales Lead"
      type="string"
      fieldType="text"
      description="The HubSpot sales lead that owns this Shared Deal."
      json={{
      "name": "hs\_synced\_deal\_owner\_name\_and\_email",
      "label": "HubSpot Sales Lead",
      "type": "string",
      "fieldType": "text",
      "description": "The HubSpot sales lead that owns this Shared Deal.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_tag\_ids"
      label="Deal Tags"
      type="enumeration"
      fieldType="checkbox"
      description="List of tag ids applicable to a deal. This property is set automatically by HubSpot."
      json={{
      "name": "hs\_tag\_ids",
      "label": "Deal Tags",
      "type": "enumeration",
      "fieldType": "checkbox",
      "description": "List of tag ids applicable to a deal. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_tcv"
      label="Total contract value"
      type="number"
      fieldType="number"
      description="The total contract value (TCV) of this deal."
      json={{
      "name": "hs\_tcv",
      "label": "Total contract value",
      "type": "number",
      "fieldType": "number",
      "description": "The total contract value (TCV) of this deal.",
      "groupName": "deal\_revenue",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_updated\_by\_user\_id"
      label="Updated by user ID"
      type="number"
      fieldType="number"
      description="The user who last updated this record. This value is set automatically by HubSpot."
      json={{
      "name": "hs\_updated\_by\_user\_id",
      "label": "Updated by user ID",
      "type": "number",
      "fieldType": "number",
      "description": "The user who last updated this record. This value is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_v2\_date\_entered\_current\_stage"
      label="Date entered current stage"
      type="datetime"
      fieldType="calculation\_equation"
      description="The date this object entered its current pipeline stage"
      json={{
      "name": "hs\_v2\_date\_entered\_current\_stage",
      "label": "Date entered current stage",
      "type": "datetime",
      "fieldType": "calculation\_equation",
      "description": "The date this object entered its current pipeline stage",
      "groupName": "dealstages",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "string\_to\_number(timestamp(dealstage))",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_v2\_time\_in\_current\_stage"
      label="Time in current stage"
      type="datetime"
      fieldType="calculation\_equation"
      description="The time this object has spent in the current pipeline stage"
      json={{
      "name": "hs\_v2\_time\_in\_current\_stage",
      "label": "Time in current stage",
      "type": "datetime",
      "fieldType": "calculation\_equation",
      "description": "The time this object has spent in the current pipeline stage",
      "groupName": "dealstages",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "hs\_v2\_date\_entered\_current\_stage",
      "dateDisplayHint": "time\_since",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hs\_weighted\_pipeline\_in\_company\_currency"
      label="Weighted open pipeline in company currency"
      type="number"
      fieldType="calculation\_equation"
      description="Sum in company currency of open deal amount, weighted by pipeline stage"
      json={{
      "name": "hs\_weighted\_pipeline\_in\_company\_currency",
      "label": "Weighted open pipeline in company currency",
      "type": "number",
      "fieldType": "calculation\_equation",
      "description": "Sum in company currency of open deal amount, weighted by pipeline stage",
      "groupName": "hubspotmetrics",
      "options": \[\],
      "displayOrder": -1,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "showCurrencySymbol": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "calculationFormula": "(hs\_open\_amount\_in\_home\_currency \* hs\_deal\_stage\_probability)",
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hubspot\_owner\_assigneddate"
      label="Owner assigned date"
      type="datetime"
      fieldType="date"
      description="The most recent timestamp of when an owner was assigned to this record. This value is set automatically by HubSpot."
      json={{
      "name": "hubspot\_owner\_assigneddate",
      "label": "Owner assigned date",
      "type": "datetime",
      "fieldType": "date",
      "description": "The most recent timestamp of when an owner was assigned to this record. This value is set automatically by HubSpot.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": -1,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hubspot\_owner\_id"
      label="Deal owner"
      type="enumeration"
      fieldType="select"
      description="User the deal is assigned to. Assign additional users to a deal record by creating a custom user property."
      json={{
      "name": "hubspot\_owner\_id",
      "label": "Deal owner",
      "type": "enumeration",
      "fieldType": "select",
      "description": "User the deal is assigned to. Assign additional users to a deal record by creating a custom user property.",
      "groupName": "dealinformation",
      "options": \[\],
      "referencedObjectType": "OWNER",
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="hubspot\_team\_id"
      label="HubSpot Team"
      type="enumeration"
      fieldType="select"
      description="Primary team of the deal owner. This property is set automatically by HubSpot."
      json={{
      "name": "hubspot\_team\_id",
      "label": "HubSpot Team",
      "type": "enumeration",
      "fieldType": "select",
      "description": "Primary team of the deal owner. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 7,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="notes\_last\_contacted"
      label="Last Contacted"
      type="datetime"
      fieldType="date"
      description="The last time a call, sales email, or meeting was logged for this deal. This is set automatically by HubSpot based on user actions."
      json={{
      "name": "notes\_last\_contacted",
      "label": "Last Contacted",
      "type": "datetime",
      "fieldType": "date",
      "description": "The last time a call, sales email, or meeting was logged for this deal. This is set automatically by HubSpot based on user actions.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="notes\_last\_updated"
      label="Last Activity Date"
      type="datetime"
      fieldType="date"
      description="The last time a note, call, email, meeting, or task was logged for a deal. This is updated automatically by HubSpot."
      json={{
      "name": "notes\_last\_updated",
      "label": "Last Activity Date",
      "type": "datetime",
      "fieldType": "date",
      "description": "The last time a note, call, email, meeting, or task was logged for a deal. This is updated automatically by HubSpot.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="notes\_next\_activity\_date"
      label="Next Activity Date"
      type="datetime"
      fieldType="date"
      description="The date of the next upcoming activity for a deal. This property is set automatically by HubSpot based on user action. This includes logging a future call, sales email, or meeting using the Log feature, as well as creating a future task or scheduling a future meeting. This is updated automatically by HubSpot."
      json={{
      "name": "notes\_next\_activity\_date",
      "label": "Next Activity Date",
      "type": "datetime",
      "fieldType": "date",
      "description": "The date of the next upcoming activity for a deal. This property is set automatically by HubSpot based on user action. This includes logging a future call, sales email, or meeting using the Log feature, as well as creating a future task or scheduling a future meeting. This is updated automatically by HubSpot.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="num\_associated\_contacts"
      label="Number of Associated Contacts"
      type="number"
      fieldType="calculation\_rollup"
      description="The number of contacts associated with this deal. This property is set automatically by HubSpot."
      json={{
      "name": "num\_associated\_contacts",
      "label": "Number of Associated Contacts",
      "type": "number",
      "fieldType": "calculation\_rollup",
      "description": "The number of contacts associated with this deal. This property is set automatically by HubSpot.",
      "groupName": "dealinformation",
      "options": \[\],
      "displayOrder": 10,
      "calculated": true,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="num\_contacted\_notes"
      label="Number of times contacted"
      type="number"
      fieldType="number"
      description="The number of times a call, chat conversation, LinkedIn message, postal mail, meeting, sales email, SMS, or WhatsApp message was logged for a deal record. This is set automatically by HubSpot based on user actions in the deal record."
      json={{
      "name": "num\_contacted\_notes",
      "label": "Number of times contacted",
      "type": "number",
      "fieldType": "number",
      "description": "The number of times a call, chat conversation, LinkedIn message, postal mail, meeting, sales email, SMS, or WhatsApp message was logged for a deal record. This is set automatically by HubSpot based on user actions in the deal record.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="num\_notes"
      label="Number of Sales Activities"
      type="number"
      fieldType="number"
      description="The number of times a call, chat conversation, LinkedIn message, postal mail, meeting, note, sales email, SMS, task, or WhatsApp message was logged for a deal record. This is set automatically by HubSpot based on user actions in the deal record."
      json={{
      "name": "num\_notes",
      "label": "Number of Sales Activities",
      "type": "number",
      "fieldType": "number",
      "description": "The number of times a call, chat conversation, LinkedIn message, postal mail, meeting, note, sales email, SMS, task, or WhatsApp message was logged for a deal record. This is set automatically by HubSpot based on user actions in the deal record.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 6,
      "calculated": false,
      "externalOptions": false,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": true
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />

    <Property
      name="pipeline"
      label="Pipeline"
      type="enumeration"
      fieldType="select"
      description="The pipeline the deal is in. This determines which stages are options for the deal."
      searchable={true}
      json={{
      "name": "pipeline",
      "label": "Pipeline",
      "type": "enumeration",
      "fieldType": "select",
      "description": "The pipeline the deal is in. This determines which stages are options for the deal.",
      "groupName": "deal\_activity",
      "options": \[\],
      "displayOrder": 4,
      "calculated": false,
      "externalOptions": true,
      "hasUniqueValue": false,
      "hidden": false,
      "hubspotDefined": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false
      },
      "formField": false,
      "dataSensitivity": "non\_sensitive"
    }}
    />
  </PropertyDefinitions>
</ObjectSummaryCard>

---
Source: [Untitled](https://developers.hubspot.com/docs/api-reference/crm-deals-v3/object-definition.md)