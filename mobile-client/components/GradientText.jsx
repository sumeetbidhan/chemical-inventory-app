import React from 'react';
import { Text, View } from 'react-native';

const GradientText = ({ children, style, colors = ['#654321', '#8B7355', '#B8860B'] }) => {
  return (
    <View style={{ position: 'relative' }}>
      {/* Base text layer */}
      <Text style={[style, { color: colors[0], fontWeight: 'bold' }]}>
        {children}
      </Text>
      
      {/* Gradient overlay text */}
      <Text 
        style={[
          style, 
          { 
            position: 'absolute',
            top: 0,
            left: 0,
            color: colors[1],
            fontWeight: 'bold',
            opacity: 0.7
          }
        ]}
      >
        {children}
      </Text>
      
      {/* Highlight text */}
      <Text 
        style={[
          style, 
          { 
            position: 'absolute',
            top: 0,
            left: 0,
            color: colors[2],
            fontWeight: 'bold',
            opacity: 0.4
          }
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

export default GradientText; 