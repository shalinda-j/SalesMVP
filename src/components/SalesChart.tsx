import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface ChartDataPoint {
  label: string;
  value: number;
  subtitle?: string;
}

interface SalesChartProps {
  data: ChartDataPoint[];
  title?: string;
  type?: 'bar' | 'line';
  height?: number;
  color?: string;
  showValues?: boolean;
  onDataPointPress?: (dataPoint: ChartDataPoint, index: number) => void;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  title,
  type = 'bar',
  height = 200,
  color = '#007bff',
  showValues = true,
  onDataPointPress,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={[styles.emptyChart, { height }]}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1; // Prevent division by zero

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getBarHeight = (value: number): number => {
    if (range === 0) return height * 0.1;
    return Math.max((value - minValue) / range * height * 0.8, height * 0.05);
  };

  const renderBarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.yAxisLabels}>
        <Text style={styles.axisLabel}>{formatValue(maxValue)}</Text>
        <Text style={styles.axisLabel}>{formatValue(maxValue / 2)}</Text>
        <Text style={styles.axisLabel}>{formatValue(minValue)}</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barsContainer}
      >
        {data.map((item, index) => {
          const barHeight = getBarHeight(item.value);
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.barContainer}
              onPress={() => onDataPointPress?.(item, index)}
              activeOpacity={0.7}
            >
              <View style={styles.barColumn}>
                {showValues && (
                  <Text style={styles.barValue}>
                    {formatValue(item.value)}
                  </Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                    }
                  ]}
                />
              </View>
              
              <View style={styles.barLabelContainer}>
                <Text style={styles.barLabel} numberOfLines={2}>
                  {item.label}
                </Text>
                {item.subtitle && (
                  <Text style={styles.barSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 280; // 280 is approximate chart width
      const y = height - getBarHeight(item.value);
      return { x, y, value: item.value, label: item.label };
    });

    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{formatValue(maxValue)}</Text>
          <Text style={styles.axisLabel}>{formatValue(maxValue / 2)}</Text>
          <Text style={styles.axisLabel}>{formatValue(minValue)}</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lineContainer}
        >
          <View style={[styles.lineChart, { height }]}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <View
                key={ratio}
                style={[
                  styles.gridLine,
                  { top: height * ratio }
                ]}
              />
            ))}
            
            {/* Line path (simplified as connected dots) */}
            {points.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.linePoint,
                  {
                    left: point.x,
                    top: point.y,
                    backgroundColor: color,
                  }
                ]}
              />
            ))}
            
            {/* Value labels */}
            {showValues && points.map((point, index) => (
              <View
                key={`label-${index}`}
                style={[
                  styles.lineValueLabel,
                  {
                    left: point.x - 20,
                    top: point.y - 25,
                  }
                ]}
              >
                <Text style={styles.lineValue}>
                  {formatValue(point.value)}
                </Text>
              </View>
            ))}
          </View>
          
          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {data.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.xAxisLabelContainer}
                onPress={() => onDataPointPress?.(item, index)}
              >
                <Text style={styles.xAxisLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.subtitle && (
                  <Text style={styles.xAxisSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {type === 'bar' ? renderBarChart() : renderLineChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingVertical: 20,
  },
  axisLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 20,
    minWidth: 300,
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 50,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  barLabelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  barSubtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  lineContainer: {
    paddingHorizontal: 8,
    paddingVertical: 20,
    minWidth: 300,
  },
  lineChart: {
    position: 'relative',
    width: 280,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  lineValueLabel: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  lineValue: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    width: 280,
  },
  xAxisLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  xAxisSubtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});
