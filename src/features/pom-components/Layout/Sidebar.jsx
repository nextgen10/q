import React, { useContext } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Tooltip, IconButton, Avatar, alpha } from '@mui/material';
import { Video, Play, Settings, FileText, Target, Star, Book, Compass, Wand2, Sparkles, Activity, Network, TrendingUp } from 'lucide-react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useSidebar } from '@/contexts/SidebarContext';
import { AppleCompass } from '../AppleCompass';

export function Sidebar({ currentView, setView, setShowLanding }) {
    const { isCollapsed, toggleSidebar, sidebarWidth } = useSidebar();

    const mainMenuItems = [
        { id: 'test_design', label: 'Test Design', icon: Sparkles, color: '#9c27b0' },
        { id: 'studio', label: 'Test Studio', icon: Video, color: '#D00000' },
        { id: 'execution', label: 'Test Execution', icon: FileText, color: '#ff9800' },
        { id: 'locators', label: 'Manage Locators', icon: Target, color: '#f44336' },
        { id: 'heal', label: 'Heal Recording', icon: Activity, color: '#e91e63' },
        { id: 'prompts', label: 'AI Prompts', icon: Wand2, color: '#D00000' },
        { id: 'settings', label: 'Configuration', icon: Settings, color: '#607d8b' },
    ];

    const bottomMenuItems = [
        { id: 'roi', label: 'ROI & Savings', icon: TrendingUp, color: '#4caf50' },
        { id: 'architecture', label: 'Architecture', icon: Network, color: '#00bcd4' },
        { id: 'guide', label: 'User Guide', icon: Book, color: '#009688' },
        { id: 'feedback', label: 'Feedback', icon: Star, color: '#ffc107' },
    ];

    const renderMenuItem = (item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        const menuButton = (
            <ListItemButton
                onClick={() => setView(item.id)}
                sx={{
                    mx: 1,
                    borderRadius: 1,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    px: isCollapsed ? 1 : 2,
                    '&.active': {
                        background: 'linear-gradient(45deg, #D00000 30%, #D00000 90%)',
                        color: '#fff',
                        boxShadow: '0 4px 14px 0 rgba(208, 0, 0, 0.39)',
                        '&:hover': {
                            filter: 'brightness(1.1)',
                        },
                        '& .MuiListItemIcon-root': {
                            color: '#fff',
                        }
                    },
                    '&:hover': {
                        bgcolor: alpha(item.color || '#D00000', 0.1),
                    }
                }}
                className={isActive ? 'active' : ''}
            >
                <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40, color: isActive ? 'inherit' : item.color, justifyContent: 'center' }}>
                    <Icon size={22} />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
        );

        return (
            <ListItem key={item.id} disablePadding>
                {isCollapsed ? (
                    <Tooltip title={item.label} placement="right">
                        {menuButton}
                    </Tooltip>
                ) : (
                    menuButton
                )}
            </ListItem>
        );
    };

    return (
        <Box
            sx={{
                width: sidebarWidth,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
                height: 'calc(100vh - 64px)',
                position: 'fixed',
                left: 0,
                top: 64,
                overflow: 'visible',
                transition: 'width 0.3s ease-in-out',
                zIndex: 1200,
            }}
        >
            {/* Scrollable Content Container */}
            <Box
                sx={{
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header — hidden in Qualaris (navbar already shows the title) */}
                <Box
                    sx={{
                        display: 'none',
                    }}
                    onClick={() => {
                        window.history.pushState({}, '', window.location.pathname);
                        setShowLanding(true);
                    }}
                >
                    {/* Expanded State */}
                    {!isCollapsed && (
                        <>
                            <Box sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                <AppleCompass size={40} />
                            </Box>

                            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 4 }}>
                                <Typography variant="h1" sx={{
                                    fontWeight: 'bold',
                                    letterSpacing: 0,
                                    fontSize: '1.1rem',
                                    whiteSpace: 'nowrap',
                                    background: 'linear-gradient(45deg, #D00000, #D00000, #D00000)',
                                    backgroundSize: '200% auto',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    lineHeight: 1.2,
                                    display: 'inline-block',
                                }}>
                                    COMPASS
                                </Typography>
                                <Typography variant="caption" sx={{ mt: .5, color: 'text.secondary', lineHeight: 1, fontSize: '0.65rem' }}>
                                    Playwright & AI Powered
                                </Typography>
                            </Box>
                        </>
                    )}

                    {/* Collapsed State - Centered Icon */}
                    {isCollapsed && (
                        <AppleCompass size={40} />
                    )}
                </Box>

                {/* Main Navigation Menu */}
                <List sx={{ pt: 2, flexGrow: 1 }}>
                    {mainMenuItems.map((item) => renderMenuItem(item))}
                </List>

                {/* Bottom Navigation Menu */}
                <List sx={{ pb: 2 }}>
                    {bottomMenuItems.map((item) => renderMenuItem(item))}
                </List>

                {/* Footer - User Profile */}
                {!isCollapsed && (
                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                            background: 'linear-gradient(45deg, #D00000 30%, #D00000 90%)',
                            color: '#fff',
                            width: 40,
                            height: 40,
                            fontSize: '1rem'
                        }}>AM</Avatar>
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                Aniket Marwadi
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Admin
                            </Typography>
                        </Box>
                    </Box>
                )}
                {isCollapsed && (
                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="Aniket Marwadi - Admin" placement="right">
                            <Avatar sx={{
                                background: 'linear-gradient(45deg, #D00000 30%, #D00000 90%)',
                                color: '#fff',
                                width: 40,
                                height: 40,
                                fontSize: '1rem'
                            }}>AM</Avatar>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            {/* Gradient Defs for Arrow */}
            <svg width={0} height={0} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', visibility: 'hidden' }}>
                <defs>
                    <linearGradient id="sidebar_arrow_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="30%" stopColor="#D00000" />
                        <stop offset="90%" stopColor="#D00000" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Toggle Button */}
            <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right">
                <IconButton
                    onClick={toggleSidebar}
                    sx={{
                        position: 'absolute',
                        right: -10,
                        top: '53%',
                        transform: 'translateY(-50%)',
                        zIndex: 1300,
                        width: 20,
                        height: 20,
                        padding: 0,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-50%) scale(1.1)',
                            background: 'linear-gradient(45deg, #D00000 30%, #D00000 90%)',
                            borderColor: 'transparent',
                            '& svg': {
                                fill: '#fff !important'
                            }
                        }
                    }}
                >
                    {isCollapsed ?
                        <ChevronLeftIcon sx={{ transform: 'rotate(180deg)', fontSize: 16, fill: "url(#sidebar_arrow_gradient)", transition: 'fill 0.3s' }} /> :
                        <ChevronLeftIcon sx={{ fontSize: 16, fill: "url(#sidebar_arrow_gradient)", transition: 'fill 0.3s' }} />
                    }
                </IconButton>
            </Tooltip>
        </Box>
    );
}
