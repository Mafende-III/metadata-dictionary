import { Badge } from '../ui/Badge';
import { QualityColor } from '../../lib/quality-assessment';

interface QualityBadgeProps {
  score: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const QualityBadge = ({
  score,
  showText = true,
  size = 'md',
}: QualityBadgeProps) => {
  // Get label and color based on score
  const getLabel = (score: number) => {
    if (score === 0) return 'Poor';
    if (score === 1) return 'Fair';
    if (score === 2) return 'Good';
    if (score === 3) return 'Very Good';
    return 'Excellent';
  };
  
  // Get badge variant based on color
  const getVariant = (color: QualityColor) => {
    switch (color) {
      case QualityColor.POOR:
        return 'danger';
      case QualityColor.FAIR:
        return 'warning';
      case QualityColor.GOOD:
        return 'secondary';
      case QualityColor.VERY_GOOD:
        return 'success';
      case QualityColor.EXCELLENT:
        return 'primary';
      default:
        return 'default';
    }
  };
  
  // Get color based on score
  const getColor = (score: number): QualityColor => {
    if (score === 0) return QualityColor.POOR;
    if (score === 1) return QualityColor.FAIR;
    if (score === 2) return QualityColor.GOOD;
    if (score === 3) return QualityColor.VERY_GOOD;
    return QualityColor.EXCELLENT;
  };
  
  const label = getLabel(score);
  const color = getColor(score);
  const variant = getVariant(color);
  
  return (
    <Badge variant={variant as any} size={size}>
      {showText ? (
        <>
          Quality: <span className="font-bold ml-1">{label}</span>
        </>
      ) : (
        <span>{score}/4</span>
      )}
    </Badge>
  );
}; 