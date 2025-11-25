import React, { useState } from 'react';
import { useLayerStack } from '../../hooks/useLayerStack';

/**
 * LayerStackDevTools - Development-only debugging panel for layer stack
 * Shows all registered layers with their properties in real-time
 * Only renders in development mode
 */
export function LayerStackDevTools() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const { getLayers } = useLayerStack();
  const [isExpanded, setIsExpanded] = useState(true);

  const layers = getLayers();
  const topLayer = layers.length > 0 ? layers[layers.length - 1] : null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff',
        minWidth: '300px',
        maxWidth: '500px',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '12px' : '0',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ fontWeight: 'bold', color: '#4ade80' }}>
          Layer Stack Dev Tools
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              backgroundColor: layers.length > 0 ? '#4ade80' : '#6b7280',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
          </span>
          <span style={{ fontSize: '14px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Layer List */}
      {isExpanded && (
        <div>
          {layers.length === 0 ? (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              No layers registered
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {layers.map((layer, index) => {
                const isTop = layer === topLayer;
                return (
                  <div
                    key={layer.id}
                    style={{
                      backgroundColor: '#2a2a2a',
                      border: isTop ? '2px solid #4ade80' : '1px solid #444',
                      borderRadius: '6px',
                      padding: '8px',
                      position: 'relative',
                    }}
                  >
                    {/* Top indicator */}
                    {isTop && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '8px',
                          backgroundColor: '#4ade80',
                          color: '#000',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        TOP
                      </div>
                    )}

                    {/* Layer properties */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>Type:</span>
                        <span style={{ color: '#60a5fa' }}>{layer.type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>Priority:</span>
                        <span style={{ color: '#fbbf24' }}>{layer.priority}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>ID:</span>
                        <span
                          style={{
                            color: '#a78bfa',
                            fontSize: '10px',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={layer.id}
                        >
                          {layer.id}
                        </span>
                      </div>
                      {layer.ariaLabel && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#9ca3af' }}>Label:</span>
                          <span style={{ color: '#f472b6' }}>{layer.ariaLabel}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>Blocks Lower:</span>
                        <span style={{ color: layer.blocksLowerLayers ? '#4ade80' : '#ef4444' }}>
                          {layer.blocksLowerLayers ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>Focus Trap:</span>
                        <span style={{ color: '#fbbf24' }}>{layer.focusTrap}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#9ca3af' }}>Captures Focus:</span>
                        <span style={{ color: layer.capturesFocus ? '#4ade80' : '#ef4444' }}>
                          {layer.capturesFocus ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
