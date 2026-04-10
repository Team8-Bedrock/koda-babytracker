import React, { useEffect, useState } from 'react';
import { 
  Bell, ClipboardList, User, Home, 
  PlusSquare, BarChart2, MessageCircle, Settings,
  ChevronDown 
} from 'lucide-react'; 
import '../App.css';

const CHILD_PROFILE_STORAGE_KEYS = [
  'childProfile',
  'child-profile',
  'child_profile',
  'registeredChild',
  'registered-child',
  'registered_child',
  'parentChildProfile',
  'parent-child-profile'
];

const PARENT_PROFILE_MAP_KEYS = [
  'parentChildProfiles',
  'parent-child-profiles',
  'parent_child_profiles',
  'childrenByParent',
  'profilesByParent'
];

const ACTIVE_PARENT_KEYS = [
  'currentUser',
  'authUser',
  'loggedInUser',
  'currentParent',
  'loggedInParent',
  'user'
];

const CHILD_PROFILE_PREFIX_KEYS = [
  'childProfile',
  'registeredChild',
  'parentChildProfile'
];

const PROFILE_PARENT_ID_KEYS = [
  'parentId',
  'parent_id',
  'userId',
  'user_id',
  'uid'
];

const PROFILE_PARENT_EMAIL_KEYS = ['parentEmail', 'parent_email', 'email', 'userEmail'];
const PROFILE_PARENT_USERNAME_KEYS = ['parentUsername', 'parent_username', 'username', 'userName'];

const readStorageValue = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
};

const parsePossibleJson = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const toSearchableSet = (values) => {
  return new Set(values.filter(Boolean).map((item) => String(item).trim().toLowerCase()));
};

const extractChildName = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value !== 'object') {
    return '';
  }

  const directKeys = ['name', 'childName', 'child_name', 'firstName', 'first_name'];

  for (const key of directKeys) {
    if (typeof value[key] === 'string' && value[key].trim()) {
      return value[key].trim();
    }
  }

  if (value.child) {
    return extractChildName(value.child);
  }

  if (value.profile) {
    return extractChildName(value.profile);
  }

  return '';
};

const extractParentIdentifiers = (value) => {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (typeof value !== 'object') {
    return [];
  }

  const values = [];
  const keyGroups = [
    ['id', 'uid', 'userId', 'user_id', 'parentId', 'parent_id'],
    ['email', 'userEmail', 'parentEmail', 'parent_email'],
    ['username', 'userName', 'parentUsername', 'parent_username']
  ];

  for (const keys of keyGroups) {
    for (const key of keys) {
      if (typeof value[key] === 'string' && value[key].trim()) {
        values.push(value[key].trim());
      }
    }
  }

  return values;
};

const profileMatchesParent = (profileValue, parentIdentitySet) => {
  if (!profileValue || typeof profileValue !== 'object' || !parentIdentitySet.size) {
    return false;
  }

  const candidateValues = [];

  for (const key of PROFILE_PARENT_ID_KEYS) {
    if (profileValue[key]) {
      candidateValues.push(profileValue[key]);
    }
  }

  for (const key of PROFILE_PARENT_EMAIL_KEYS) {
    if (profileValue[key]) {
      candidateValues.push(profileValue[key]);
    }
  }

  for (const key of PROFILE_PARENT_USERNAME_KEYS) {
    if (profileValue[key]) {
      candidateValues.push(profileValue[key]);
    }
  }

  return candidateValues.some((candidate) => {
    return parentIdentitySet.has(String(candidate).trim().toLowerCase());
  });
};

const getActiveParentIdentifiers = (storages) => {
  const identifiers = [];

  for (const storage of storages) {
    for (const key of ACTIVE_PARENT_KEYS) {
      const rawValue = readStorageValue(storage, key);

      if (!rawValue) {
        continue;
      }

      identifiers.push(...extractParentIdentifiers(parsePossibleJson(rawValue)));
    }
  }

  return Array.from(new Set(identifiers));
};

const findNameInParentMap = (mapValue, parentIdentifiers) => {
  if (!mapValue || typeof mapValue !== 'object' || !parentIdentifiers.length) {
    return '';
  }

  for (const identifier of parentIdentifiers) {
    const candidate = mapValue[identifier] || mapValue[identifier.toLowerCase()];
    const name = extractChildName(candidate);

    if (name) {
      return name;
    }
  }

  return '';
};

const findNameInCollection = (collectionValue, parentIdentitySet) => {
  if (!collectionValue) {
    return '';
  }

  if (Array.isArray(collectionValue)) {
    const matchingProfile = collectionValue.find((item) => profileMatchesParent(item, parentIdentitySet));
    const matchingName = extractChildName(matchingProfile);

    if (matchingName) {
      return matchingName;
    }

    return extractChildName(collectionValue[0]);
  }

  if (typeof collectionValue === 'object') {
    for (const nestedValue of Object.values(collectionValue)) {
      const nestedName = findNameInCollection(nestedValue, parentIdentitySet);

      if (nestedName) {
        return nestedName;
      }
    }
  }

  return '';
};

const getStoredChildName = () => {
  const storages = [localStorage, sessionStorage];
  const parentIdentifiers = getActiveParentIdentifiers(storages);
  const parentIdentitySet = toSearchableSet(parentIdentifiers);

  for (const storage of storages) {
    for (const key of PARENT_PROFILE_MAP_KEYS) {
      const rawValue = readStorageValue(storage, key);

      if (!rawValue) {
        continue;
      }

      const parsed = parsePossibleJson(rawValue);
      const nameFromMap = findNameInParentMap(parsed, parentIdentifiers);

      if (nameFromMap) {
        return nameFromMap;
      }
    }
  }

  for (const storage of storages) {
    for (const identifier of parentIdentifiers) {
      for (const keyPrefix of CHILD_PROFILE_PREFIX_KEYS) {
        const rawValue = readStorageValue(storage, `${keyPrefix}:${identifier}`);

        if (!rawValue) {
          continue;
        }

        const parsed = parsePossibleJson(rawValue);
        const scopedName = extractChildName(parsed);

        if (scopedName) {
          return scopedName;
        }
      }
    }
  }

  for (const storage of storages) {
    for (const key of CHILD_PROFILE_STORAGE_KEYS) {
      const rawValue = readStorageValue(storage, key);

      if (!rawValue) {
        continue;
      }

      const parsed = parsePossibleJson(rawValue);
      const scopedName = findNameInCollection(parsed, parentIdentitySet);

      if (scopedName) {
        return scopedName;
      }

      const fallbackName = extractChildName(parsed);

      if (fallbackName) {
        return fallbackName;
      }
    }
  }

  return '';
};

const ParentDashboard = () => {
  //placeholder for now, basically empty
  const [activities] = useState([]); 
  //^ same thing here
  const [caregivers] = useState([]);
  const [childName, setChildName] = useState(() => getStoredChildName() || 'Child');

  useEffect(() => {
    const syncChildName = () => {
      const latestName = getStoredChildName();
      setChildName(latestName || 'Child');
    };

    syncChildName();
    window.addEventListener('storage', syncChildName);
    window.addEventListener('child-profile-updated', syncChildName);
    window.addEventListener('auth-state-changed', syncChildName);

    return () => {
      window.removeEventListener('storage', syncChildName);
      window.removeEventListener('child-profile-updated', syncChildName);
      window.removeEventListener('auth-state-changed', syncChildName);
    };
  }, []);

  return (
    <div className="dashboard-container" style={{ backgroundImage: `url('/lightmode.jpg')` }}>
      
      <header className="dashboard-header">
        <img src="/koda-logo.png" alt="Koda" className="koda-logo" />
        
        {/* Child Name Dropdown Button */}
        <button className="name-dropdown-btn">
          {childName} <ChevronDown size={20} strokeWidth={2.5} />
        </button>

        <Bell size={28} strokeWidth={1.5} className="nav-icon" />
      </header>

      <div className="glass-card first-card">
        <div className="card-header">
          <ClipboardList size={24} strokeWidth={2} />
          <span>todays activities</span>
        </div>

        <p className="empty-msg-light">No activities yet. Tap the + to get started!</p>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <User size={24} strokeWidth={2} />
          <span>caregivers</span>
        </div>
        
        <p className="empty-msg-light">No caregivers yet. Add a caregiver to share the load!</p>
      </div>

      <img src="/bear-character.png" alt="Koda Bear" className="bear-character" />

      <nav className="bottom-nav">
        <Home size={28} strokeWidth={1.5} className="nav-icon" />
        <PlusSquare size={36} strokeWidth={1.5} className="nav-icon plus-btn" />
        <BarChart2 size={28} strokeWidth={1.5} className="nav-icon" />
        <MessageCircle size={28} strokeWidth={1.5} className="nav-icon" />
        <Settings size={28} strokeWidth={1.5} className="nav-icon" />
      </nav>
    </div>
  );
};

export default ParentDashboard;