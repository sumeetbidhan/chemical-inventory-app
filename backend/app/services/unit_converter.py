"""
Unit Conversion Service for Chemical Inventory System
Handles automatic conversion between different units of measurement
"""

from typing import Dict, Tuple, Optional
from enum import Enum


class UnitType(Enum):
    """Types of units for conversion"""
    MASS = "mass"      # g, kg, mg, lb, oz
    VOLUME = "volume"  # ml, l, gal, qt
    LENGTH = "length"  # m, cm, mm, in
    COUNT = "count"    # pieces, units
    PERCENTAGE = "percentage"  # %, ppm, ppb


class UnitConverter:
    """Handles unit conversions for chemical quantities"""
    
    # Conversion factors (base unit is the first in each category)
    CONVERSION_FACTORS = {
        UnitType.MASS: {
            "mg": 0.001,      # milligrams to grams
            "g": 1.0,         # grams (base unit)
            "kg": 1000.0,     # kilograms to grams
            "lb": 453.592,    # pounds to grams
            "oz": 28.3495,    # ounces to grams
        },
        UnitType.VOLUME: {
            "ml": 1.0,        # milliliters (base unit)
            "l": 1000.0,      # liters to milliliters
            "gal": 3785.41,   # gallons to milliliters
            "qt": 946.353,    # quarts to milliliters
            "fl_oz": 29.5735, # fluid ounces to milliliters
        },
        UnitType.LENGTH: {
            "mm": 0.1,        # millimeters to centimeters
            "cm": 1.0,        # centimeters (base unit)
            "m": 100.0,       # meters to centimeters
            "in": 2.54,       # inches to centimeters
            "ft": 30.48,      # feet to centimeters
        },
        UnitType.COUNT: {
            "piece": 1.0,     # pieces (base unit)
            "unit": 1.0,      # units
            "dozen": 12.0,    # dozen to pieces
            "hundred": 100.0, # hundred to pieces
        },
        UnitType.PERCENTAGE: {
            "%": 1.0,         # percentage (base unit)
            "ppm": 0.0001,    # parts per million to percentage
            "ppb": 0.0000001, # parts per billion to percentage
        }
    }
    
    # Unit type mapping
    UNIT_TYPES = {
        # Mass units
        "mg": UnitType.MASS, "g": UnitType.MASS, "kg": UnitType.MASS,
        "lb": UnitType.MASS, "oz": UnitType.MASS,
        
        # Volume units
        "ml": UnitType.VOLUME, "l": UnitType.VOLUME, "gal": UnitType.VOLUME,
        "qt": UnitType.VOLUME, "fl_oz": UnitType.VOLUME,
        
        # Length units
        "mm": UnitType.LENGTH, "cm": UnitType.LENGTH, "m": UnitType.LENGTH,
        "in": UnitType.LENGTH, "ft": UnitType.LENGTH,
        
        # Count units
        "piece": UnitType.COUNT, "unit": UnitType.COUNT, "dozen": UnitType.COUNT,
        "hundred": UnitType.COUNT,
        
        # Percentage units
        "%": UnitType.PERCENTAGE, "ppm": UnitType.PERCENTAGE, "ppb": UnitType.PERCENTAGE
    }
    
    @classmethod
    def get_unit_type(cls, unit: str) -> Optional[UnitType]:
        """Get the type of a unit"""
        return cls.UNIT_TYPES.get(unit.lower())
    
    @classmethod
    def can_convert(cls, from_unit: str, to_unit: str) -> bool:
        """Check if conversion between units is possible"""
        from_type = cls.get_unit_type(from_unit)
        to_type = cls.get_unit_type(to_unit)
        return from_type is not None and to_type == from_type
    
    @classmethod
    def convert(cls, value: float, from_unit: str, to_unit: str) -> float:
        """
        Convert a value from one unit to another
        
        Args:
            value: The value to convert
            from_unit: The source unit
            to_unit: The target unit
            
        Returns:
            Converted value
            
        Raises:
            ValueError: If conversion is not possible
        """
        from_unit = from_unit.lower()
        to_unit = to_unit.lower()
        
        if from_unit == to_unit:
            return value
        
        from_type = cls.get_unit_type(from_unit)
        to_type = cls.get_unit_type(to_unit)
        
        if not from_type or not to_type:
            raise ValueError(f"Unknown unit: {from_unit} or {to_unit}")
        
        if from_type != to_type:
            raise ValueError(f"Cannot convert between different unit types: {from_unit} ({from_type.value}) to {to_unit} ({to_type.value})")
        
        # Get conversion factors
        factors = cls.CONVERSION_FACTORS[from_type]
        
        if from_unit not in factors or to_unit not in factors:
            raise ValueError(f"Unsupported conversion: {from_unit} to {to_unit}")
        
        # Convert to base unit first, then to target unit
        base_value = value * factors[from_unit]
        converted_value = base_value / factors[to_unit]
        
        return converted_value
    
    @classmethod
    def convert_to_base_unit(cls, value: float, unit: str) -> Tuple[float, str]:
        """
        Convert a value to its base unit
        
        Args:
            value: The value to convert
            unit: The current unit
            
        Returns:
            Tuple of (converted_value, base_unit)
        """
        unit = unit.lower()
        unit_type = cls.get_unit_type(unit)
        
        if not unit_type:
            raise ValueError(f"Unknown unit: {unit}")
        
        factors = cls.CONVERSION_FACTORS[unit_type]
        
        if unit not in factors:
            raise ValueError(f"Unsupported unit: {unit}")
        
        # Find base unit (factor = 1.0)
        base_unit = next(u for u, f in factors.items() if f == 1.0)
        base_value = value * factors[unit]
        
        return base_value, base_unit
    
    @classmethod
    def get_common_units(cls, unit_type: UnitType) -> list:
        """Get common units for a given unit type"""
        return list(cls.CONVERSION_FACTORS.get(unit_type, {}).keys())
    
    @classmethod
    def get_unit_info(cls, unit: str) -> Dict:
        """Get information about a unit"""
        unit = unit.lower()
        unit_type = cls.get_unit_type(unit)
        
        if not unit_type:
            return {"unit": unit, "type": None, "supported": False}
        
        factors = cls.CONVERSION_FACTORS[unit_type]
        is_base = factors.get(unit, 0) == 1.0
        
        return {
            "unit": unit,
            "type": unit_type.value,
            "supported": True,
            "is_base_unit": is_base,
            "conversion_factor": factors.get(unit, 1.0),
            "common_units": cls.get_common_units(unit_type)
        }


# Convenience functions for common conversions
def convert_mass(value: float, from_unit: str, to_unit: str) -> float:
    """Convert mass units (mg, g, kg, lb, oz)"""
    return UnitConverter.convert(value, from_unit, to_unit)


def convert_volume(value: float, from_unit: str, to_unit: str) -> float:
    """Convert volume units (ml, l, gal, qt, fl_oz)"""
    return UnitConverter.convert(value, from_unit, to_unit)


def convert_length(value: float, from_unit: str, to_unit: str) -> float:
    """Convert length units (mm, cm, m, in, ft)"""
    return UnitConverter.convert(value, from_unit, to_unit)


def convert_count(value: float, from_unit: str, to_unit: str) -> float:
    """Convert count units (piece, unit, dozen, hundred)"""
    return UnitConverter.convert(value, from_unit, to_unit)


def convert_percentage(value: float, from_unit: str, to_unit: str) -> float:
    """Convert percentage units (%, ppm, ppb)"""
    return UnitConverter.convert(value, from_unit, to_unit)


# Smart conversion function that detects unit type
def smart_convert(value: float, from_unit: str, to_unit: str) -> float:
    """Automatically detect unit type and convert"""
    return UnitConverter.convert(value, from_unit, to_unit)


# Example usage and testing
if __name__ == "__main__":
    # Test mass conversions
    print("Mass conversions:")
    print(f"1 kg = {convert_mass(1, 'kg', 'g')} g")
    print(f"500 g = {convert_mass(500, 'g', 'kg')} kg")
    print(f"1 lb = {convert_mass(1, 'lb', 'g')} g")
    
    # Test volume conversions
    print("\nVolume conversions:")
    print(f"1 l = {convert_volume(1, 'l', 'ml')} ml")
    print(f"1000 ml = {convert_volume(1000, 'ml', 'l')} l")
    
    # Test unit info
    print("\nUnit information:")
    print(f"kg info: {UnitConverter.get_unit_info('kg')}")
    print(f"l info: {UnitConverter.get_unit_info('l')}")
    
    # Test smart conversion
    print("\nSmart conversions:")
    print(f"2 kg to g: {smart_convert(2, 'kg', 'g')}")
    print(f"1.5 l to ml: {smart_convert(1.5, 'l', 'ml')}")

