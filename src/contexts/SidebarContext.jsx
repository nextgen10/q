"use client";
import React, { createContext, useState, useContext } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev);
    };

    const sidebarWidth = isCollapsed ? 70 : 220;

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, sidebarWidth }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
}
