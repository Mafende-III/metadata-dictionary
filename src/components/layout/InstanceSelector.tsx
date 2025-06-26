'use client';

import { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

interface Instance {
  id: string;
  name: string;
  url: string;
  isActive?: boolean;
}

interface InstanceSelectorProps {
  currentInstance?: Instance;
  instances?: Instance[];
  onInstanceChange?: (instance: Instance) => void;
  onAddInstance?: () => void;
}

const defaultInstances: Instance[] = [
  {
    id: 'demo',
    name: 'Demo DHIS2',
    url: 'https://play.dhis2.org/demo',
    isActive: true
  },
  {
    id: 'dev',
    name: 'Development',
    url: 'https://dev.dhis2.org',
    isActive: false
  }
];

export default function InstanceSelector({
  currentInstance,
  instances = defaultInstances,
  onInstanceChange,
  onAddInstance
}: InstanceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeInstance = currentInstance || instances.find(i => i.isActive) || instances[0];

  const handleInstanceSelect = (instance: Instance) => {
    onInstanceChange?.(instance);
    setIsOpen(false);
  };

  const handleAddInstance = () => {
    onAddInstance?.();
    setIsOpen(false);
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="hidden sm:inline">Instance:</span>
            <span className="font-semibold">{activeInstance.name}</span>
          </div>
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-20 mt-2 w-72 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              DHIS2 Instances
            </div>
            
            {instances.map((instance) => (
              <Menu.Item key={instance.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleInstanceSelect(instance)}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } group flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        instance.id === activeInstance.id ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div className="text-left">
                        <div className="font-medium">{instance.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {instance.url}
                        </div>
                      </div>
                    </div>
                    {instance.id === activeInstance.id && (
                      <CheckIcon className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
            
            <div className="border-t border-gray-100 mt-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleAddInstance}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } group flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50`}
                  >
                    <PlusIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Add New Instance</span>
                  </button>
                )}
              </Menu.Item>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}