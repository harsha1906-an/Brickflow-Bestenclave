import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const InstallApp = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        console.log('InstallApp component mounted');
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log('beforeinstallprompt event captured');
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                setDeferredPrompt(null);
            });
        } else {
            // Show instructions modal
            setShowInstructions(true);
        }
    };

    return (
        <>
            <div style={{
                position: 'fixed',
                top: '100px',
                right: '10px',
                background: 'red',
                color: 'white',
                padding: '10px',
                zIndex: 9999,
                border: '3px solid yellow'
            }}>
                DEBUG: InstallApp Loaded!
            </div>
            <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleInstallClick}
                data-testid="install-app-button"
                style={{ 
                    display: 'block',
                    visibility: 'visible',
                    zIndex: 1000
                }}
            >
                Install App
            </Button>

            <Modal
                title="Install Brick Flow App"
                open={showInstructions}
                onCancel={() => setShowInstructions(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setShowInstructions(false)}>
                        Close
                    </Button>
                ]}
            >
                <div>
                    <h4>To install this app on your device:</h4>
                    
                    <h5>Chrome/Edge (Desktop):</h5>
                    <ol>
                        <li>Click the install icon (⊕) in the address bar</li>
                        <li>Or click menu (⋮) → "Install Brick Flow..."</li>
                    </ol>

                    <h5>Chrome/Edge (Mobile):</h5>
                    <ol>
                        <li>Tap menu (⋮) → "Add to Home screen"</li>
                        <li>Tap "Install" or "Add"</li>
                    </ol>

                    <h5>Safari (iOS):</h5>
                    <ol>
                        <li>Tap the Share button (□↑)</li>
                        <li>Scroll and tap "Add to Home Screen"</li>
                    </ol>

                    <p><strong>Note:</strong> App installation requires HTTPS. If you don't see the install option, please ensure you're accessing the app via a secure connection.</p>
                </div>
            </Modal>
        </>
    );
};

export default InstallApp;
