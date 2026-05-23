import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../constants/theme';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  id:       string;
  name:     string;
  name_ne?: string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  serving:  string;
  isNepali?: boolean;
}

interface LoggedFood {
  id:       string;
  food:     FoodItem;
  meal:     MealType;
  servings: number;
}

const NEPALI_FOODS: FoodItem[] = [
  { id: 'n1', name: 'Dal Bhat',        name_ne: 'दाल भात',    calories: 485, protein: 18, carbs: 82, fat: 8,  serving: '1 plate',    isNepali: true },
  { id: 'n2', name: 'Chicken Momo',    name_ne: 'चिकन मोमो',   calories: 390, protein: 24, carbs: 42, fat: 12, serving: '10 pieces',  isNepali: true },
  { id: 'n3', name: 'Buff Momo',       name_ne: 'बफ मोमो',     calories: 420, protein: 26, carbs: 42, fat: 14, serving: '10 pieces',  isNepali: true },
  { id: 'n4', name: 'Sel Roti',        name_ne: 'सेल रोटी',    calories: 180, protein: 3,  carbs: 32, fat: 5,  serving: '1 piece',    isNepali: true },
  { id: 'n5', name: 'Chiura',          name_ne: 'चिउरा',       calories: 345, protein: 7,  carbs: 76, fat: 1,  serving: '100g',       isNepali: true },
  { id: 'n6', name: 'Aloo Tama',       name_ne: 'आलु तामा',    calories: 145, protein: 4,  carbs: 28, fat: 3,  serving: '1 bowl',     isNepali: true },
  { id: 'n7', name: 'Gundruk',         name_ne: 'गुन्द्रुक',   calories: 35,  protein: 3,  carbs: 5,  fat: 0,  serving: '50g',        isNepali: true },
  { id: 'n8', name: 'Thukpa',          name_ne: 'थुक्पा',      calories: 320, protein: 16, carbs: 48, fat: 7,  serving: '1 bowl',     isNepali: true },
  { id: 'n9', name: 'Chatamari',       name_ne: 'चताम्मरी',   calories: 210, protein: 8,  carbs: 30, fat: 7,  serving: '1 piece',    isNepali: true },
  { id: 'n10',name: 'Dhindo',          name_ne: 'ढिँडो',       calories: 280, protein: 5,  carbs: 62, fat: 1,  serving: '1 bowl',     isNepali: true },
];

const GLOBAL_FOODS: FoodItem[] = [
  { id: 'g1', name: 'Chicken Breast',  calories: 165, protein: 31, carbs: 0,  fat: 4,  serving: '100g' },
  { id: 'g2', name: 'Brown Rice',      calories: 216, protein: 5,  carbs: 45, fat: 2,  serving: '1 cup cooked' },
  { id: 'g3', name: 'Whole Egg',       calories: 72,  protein: 6,  carbs: 0,  fat: 5,  serving: '1 large' },
  { id: 'g4', name: 'Banana',          calories: 105, protein: 1,  carbs: 27, fat: 0,  serving: '1 medium' },
  { id: 'g5', name: 'Greek Yogurt',    calories: 130, protein: 17, carbs: 9,  fat: 0,  serving: '200g' },
  { id: 'g6', name: 'Oats',            calories: 307, protein: 11, carbs: 55, fat: 5,  serving: '100g dry' },
  { id: 'g7', name: 'Whey Protein',    calories: 120, protein: 25, carbs: 3,  fat: 2,  serving: '1 scoop' },
  { id: 'g8', name: 'Almonds',         calories: 164, protein: 6,  carbs: 6,  fat: 14, serving: '28g' },
];

const ALL_FOODS = [...NEPALI_FOODS, ...GLOBAL_FOODS];

const MEAL_CONFIG: {
  id:    MealType;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  time:  string;
}[] = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline',   time: '7:00 AM' },
  { id: 'lunch',     label: 'Lunch',     icon: 'restaurant-outline', time: '1:00 PM' },
  { id: 'dinner',    label: 'Dinner',    icon: 'moon-outline',    time: '7:00 PM' },
  { id: 'snack',     label: 'Snack',     icon: 'cafe-outline',    time: 'Anytime' },
];

const CALORIE_GOAL  = 2400;
const PROTEIN_GOAL  = 160;
const CARBS_GOAL    = 280;
const FAT_GOAL      = 70;
const WATER_GOAL    = 8;

function MacroBar({
  label,
  value,
  goal,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  goal:  number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min(value / goal, 1);
  return (
    <View style={macroStyles.wrap}>
      <View style={macroStyles.labelRow}>
        <Text style={macroStyles.label}>{label}</Text>
        <Text style={macroStyles.value}>
          <Text style={{ color }}>{value}</Text>
          <Text style={macroStyles.goal}> / {goal}{unit}</Text>
        </Text>
      </View>
      <View style={macroStyles.track}>
        <View style={[macroStyles.fill, {
          width:           `${Math.round(pct * 100)}%` as any,
          backgroundColor: color,
        }]} />
      </View>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  wrap: { gap: 5, marginBottom: Spacing.S3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: Colors.TEXT_SECONDARY, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '600' },
  goal:  { color: Colors.TEXT_TERTIARY, fontWeight: '400' },
  track: {
    height: 4, backgroundColor: Colors.BG_SURFACE_3,
    borderRadius: 2, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
});

export function DietScreen() {
  const [logged,       setLogged]       = useState<LoggedFood[]>([
    { id: 'l1', food: NEPALI_FOODS[0], meal: 'breakfast', servings: 1 },
    { id: 'l2', food: NEPALI_FOODS[1], meal: 'lunch',     servings: 1 },
  ]);
  const [water,        setWater]        = useState(3);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [addingMeal,   setAddingMeal]   = useState<MealType | null>(null);
  const [filterNepali, setFilterNepali] = useState(false);

  const totalCals    = logged.reduce((s, l) => s + l.food.calories * l.servings, 0);
  const totalProtein = logged.reduce((s, l) => s + l.food.protein  * l.servings, 0);
  const totalCarbs   = logged.reduce((s, l) => s + l.food.carbs    * l.servings, 0);
  const totalFat     = logged.reduce((s, l) => s + l.food.fat      * l.servings, 0);
  const remaining    = CALORIE_GOAL - totalCals;
  const calPct       = Math.min(totalCals / CALORIE_GOAL, 1);

  const searchResults = ALL_FOODS.filter((f) => {
    const matchesQuery  = f.name.toLowerCase().includes(searchQuery.toLowerCase())
      || (f.name_ne && f.name_ne.includes(searchQuery));
    const matchesFilter = !filterNepali || f.isNepali;
    return matchesQuery && matchesFilter;
  });

  function addFood(food: FoodItem) {
    if (!addingMeal) return;
    const newLog: LoggedFood = {
      id:       Math.random().toString(36).slice(2),
      food,
      meal:     addingMeal,
      servings: 1,
    };
    setLogged((prev) => [...prev, newLog]);
    setAddingMeal(null);
    setSearchQuery('');
  }

  function removeFood(id: string) {
    setLogged((prev) => prev.filter((l) => l.id !== id));
  }

  function getMealLogs(meal: MealType) {
    return logged.filter((l) => l.meal === meal);
  }

  function getMealCalories(meal: MealType) {
    return getMealLogs(meal).reduce((s, l) => s + l.food.calories * l.servings, 0);
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Nutrition</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <TouchableOpacity style={styles.scanBtn}>
            <Ionicons name="barcode-outline" size={18} color={Colors.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Calorie summary */}
        <View style={styles.calCard}>
          <View style={styles.calTop}>
            <View style={styles.calLeft}>
              <Text style={styles.calRemaining}>{remaining.toLocaleString()}</Text>
              <Text style={styles.calLabel}>kcal remaining</Text>
              <Text style={styles.calSub}>
                {totalCals.toLocaleString()} eaten · {CALORIE_GOAL.toLocaleString()} goal
              </Text>
            </View>
            <View style={styles.calRingWrap}>
              <View style={styles.calRingOuter}>
                <View style={[styles.calRingFill, {
                  borderColor: remaining < 0 ? Colors.RED : Colors.ACCENT,
                  opacity:     calPct,
                }]} />
                <View style={styles.calRingTrack} />
                <View style={styles.calRingCenter}>
                  <Text style={[styles.calRingPct, {
                    color: remaining < 0 ? Colors.RED : Colors.ACCENT,
                  }]}>
                    {Math.round(calPct * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.calDivider} />

          <MacroBar label="Protein" value={totalProtein} goal={PROTEIN_GOAL} color={Colors.BLUE}   />
          <MacroBar label="Carbs"   value={totalCarbs}   goal={CARBS_GOAL}   color={Colors.ORANGE} />
          <MacroBar label="Fat"     value={totalFat}     goal={FAT_GOAL}     color={Colors.PURPLE} />
        </View>

        {/* Water tracker */}
        <View style={styles.waterCard}>
          <View style={styles.waterLeft}>
            <Ionicons name="water-outline" size={16} color={Colors.BLUE} />
            <Text style={styles.waterLabel}>Water</Text>
            <Text style={styles.waterCount}>
              <Text style={{ color: Colors.BLUE }}>{water}</Text>
              <Text style={styles.waterGoal}> / {WATER_GOAL} glasses</Text>
            </Text>
          </View>
          <View style={styles.waterGlasses}>
            {Array.from({ length: WATER_GOAL }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setWater(i + 1)}
                style={[
                  styles.waterGlass,
                  i < water && styles.waterGlassFull,
                ]}
              >
                <Ionicons
                  name="water"
                  size={12}
                  color={i < water ? Colors.BLUE : Colors.BG_SURFACE_3}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal sections */}
        {MEAL_CONFIG.map((meal) => {
          const mealLogs = getMealLogs(meal.id);
          const mealCals = getMealCalories(meal.id);

          return (
            <View key={meal.id} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderLeft}>
                  <Ionicons name={meal.icon} size={14} color={Colors.TEXT_TERTIARY} />
                  <Text style={styles.mealName}>{meal.label}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <View style={styles.mealHeaderRight}>
                  {mealCals > 0 && (
                    <Text style={styles.mealCals}>{mealCals} kcal</Text>
                  )}
                  <TouchableOpacity
                    style={styles.addFoodBtn}
                    onPress={() => setAddingMeal(meal.id)}
                  >
                    <Ionicons name="add" size={14} color={Colors.ACCENT} />
                  </TouchableOpacity>
                </View>
              </View>

              {mealLogs.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyMeal}
                  onPress={() => setAddingMeal(meal.id)}
                >
                  <Ionicons name="add-circle-outline" size={16} color={Colors.TEXT_TERTIARY} />
                  <Text style={styles.emptyMealText}>Add {meal.label.toLowerCase()}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.foodList}>
                  {mealLogs.map((log) => (
                    <View key={log.id} style={styles.foodRow}>
                      <View style={styles.foodInfo}>
                        <View style={styles.foodNameRow}>
                          <Text style={styles.foodName}>{log.food.name}</Text>
                          {log.food.isNepali && (
                            <View style={styles.nepaliTag}>
                              <Text style={styles.nepaliTagText}>नेपाली</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.foodServing}>
                          {log.food.serving} · {log.food.protein}g protein
                        </Text>
                      </View>
                      <Text style={styles.foodCals}>
                        {log.food.calories * log.servings}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeFood(log.id)}
                      >
                        <Ionicons name="close" size={14} color={Colors.TEXT_TERTIARY} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={() => setAddingMeal(meal.id)}
                  >
                    <Ionicons name="add" size={12} color={Colors.ACCENT} />
                    <Text style={styles.addMoreText}>Add food</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* AI suggestion strip */}
        <TouchableOpacity style={styles.aiStrip} activeOpacity={0.8}>
          <Ionicons name="sparkles" size={14} color={Colors.PURPLE} />
          <Text style={styles.aiStripText}>
            Kai suggests adding 48g more protein today
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.TEXT_TERTIARY} />
        </TouchableOpacity>

      </ScrollView>

      {/* Food search modal */}
      <Modal
        visible={addingMeal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddingMeal(null)}
      >
        <View style={modalStyles.root}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              Add to {MEAL_CONFIG.find((m) => m.id === addingMeal)?.label}
            </Text>
            <TouchableOpacity onPress={() => setAddingMeal(null)}>
              <Ionicons name="close" size={22} color={Colors.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={modalStyles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.TEXT_TERTIARY} />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search foods or नेपाली खाना..."
              placeholderTextColor={Colors.TEXT_TERTIARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.TEXT_TERTIARY} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter toggle */}
          <View style={modalStyles.filterRow}>
            <TouchableOpacity
              style={[
                modalStyles.filterChip,
                !filterNepali && modalStyles.filterChipActive,
              ]}
              onPress={() => setFilterNepali(false)}
            >
              <Text style={[
                modalStyles.filterText,
                !filterNepali && modalStyles.filterTextActive,
              ]}>All foods</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.filterChip,
                filterNepali && modalStyles.filterChipActive,
              ]}
              onPress={() => setFilterNepali(true)}
            >
              <Text style={[
                modalStyles.filterText,
                filterNepali && modalStyles.filterTextActive,
              ]}>Nepali foods</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          <ScrollView
            style={modalStyles.results}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.length === 0 ? (
              <View style={modalStyles.noResults}>
                <Ionicons name="search" size={32} color={Colors.TEXT_TERTIARY} />
                <Text style={modalStyles.noResultsText}>No foods found</Text>
              </View>
            ) : (
              searchResults.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={modalStyles.foodItem}
                  onPress={() => addFood(food)}
                >
                  <View style={modalStyles.foodItemLeft}>
                    <View style={modalStyles.foodItemNameRow}>
                      <Text style={modalStyles.foodItemName}>{food.name}</Text>
                      {food.isNepali && (
                        <View style={modalStyles.nepaliTag}>
                          <Text style={modalStyles.nepaliTagText}>नेपाली</Text>
                        </View>
                      )}
                    </View>
                    {food.name_ne && (
                      <Text style={modalStyles.foodItemNe}>{food.name_ne}</Text>
                    )}
                    <Text style={modalStyles.foodItemMeta}>
                      {food.serving} · P {food.protein}g · C {food.carbs}g · F {food.fat}g
                    </Text>
                  </View>
                  <View style={modalStyles.foodItemRight}>
                    <Text style={modalStyles.foodItemCals}>{food.calories}</Text>
                    <Text style={modalStyles.foodItemCalLabel}>kcal</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    paddingTop:    56,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S5,
  },
  eyebrow: {
    fontSize:      12,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom:  3,
  },
  title: {
    fontSize:     30,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -1,
  },
  scanBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Calorie card
  calCard: {
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  calTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.S4,
  },
  calLeft: {
    gap: 3,
  },
  calRemaining: {
    fontSize:     36,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -1.5,
    lineHeight:   40,
  },
  calLabel: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  calSub: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  calRingWrap: {
    width:  80,
    height: 80,
  },
  calRingOuter: {
    width:          80,
    height:         80,
    borderRadius:   40,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  calRingFill: {
    position:     'absolute',
    width:        80,
    height:       80,
    borderRadius: 40,
    borderWidth:  8,
  },
  calRingTrack: {
    position:        'absolute',
    width:           80,
    height:          80,
    borderRadius:    40,
    borderWidth:     8,
    borderColor:     Colors.BG_SURFACE_3,
    opacity:         0.4,
  },
  calRingCenter: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  calRingPct: {
    fontSize:   15,
    fontWeight: '700',
  },
  calDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginBottom:    Spacing.S4,
  },

  // Water
  waterCard: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    gap:               Spacing.S4,
  },
  waterLeft: {
    gap: 2,
  },
  waterLabel: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  waterCount: {
    fontSize:   18,
    fontWeight: '700',
    color:      Colors.TEXT_PRIMARY,
  },
  waterGoal: {
    fontSize:   14,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '400',
  },
  waterGlasses: {
    flex:          1,
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           4,
    justifyContent: 'flex-end',
  },
  waterGlass: {
    width:          24,
    height:         24,
    borderRadius:   6,
    backgroundColor: Colors.BG_SURFACE_2,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    StyleSheet.hairlineWidth,
    borderColor:    Colors.BORDER,
  },
  waterGlassFull: {
    backgroundColor: Colors.BLUE + '20',
    borderColor:     Colors.BLUE + '40',
  },

  // Meal sections
  mealSection: {
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    overflow:          'hidden',
  },
  mealHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        Spacing.S4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  mealName: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
  },
  mealTime: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  mealCals: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  addFoodBtn: {
    width:           28,
    height:          28,
    borderRadius:    8,
    backgroundColor: Colors.ACCENT_DIM,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.ACCENT + '40',
    alignItems:      'center',
    justifyContent:  'center',
  },
  emptyMeal: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    padding:        Spacing.S4,
  },
  emptyMealText: {
    fontSize: 13,
    color:    Colors.TEXT_TERTIARY,
  },
  foodList: {
    paddingHorizontal: Spacing.S4,
    paddingBottom:     Spacing.S2,
  },
  foodRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
    gap:               Spacing.S3,
  },
  foodInfo: {
    flex: 1,
    gap:  2,
  },
  foodNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  foodName: {
    fontSize:   13,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  nepaliTag: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    backgroundColor:   Colors.ACCENT_DIM,
    borderRadius:      4,
  },
  nepaliTagText: {
    fontSize:   9,
    color:      Colors.ACCENT,
    fontWeight: '600',
  },
  foodServing: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  foodCals: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  removeBtn: {
    width:          24,
    height:         24,
    borderRadius:   6,
    alignItems:     'center',
    justifyContent: 'center',
  },
  addMoreBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingVertical: Spacing.S2,
  },
  addMoreText: {
    fontSize:   12,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },

  // AI strip
  aiStrip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.S3,
    marginHorizontal:  Spacing.S5,
    marginTop:         Spacing.S2,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    backgroundColor:   Colors.PURPLE + '10',
    borderRadius:      Radius.LG,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.PURPLE + '30',
  },
  aiStripText: {
    flex:     1,
    fontSize: 12,
    color:    Colors.TEXT_SECONDARY,
  },
});

const modalStyles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
    paddingTop:      Spacing.S3,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.BG_SURFACE_3,
    alignSelf:       'center',
    marginBottom:    Spacing.S4,
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
  },
  title: {
    fontSize:     18,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.S3,
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.LG,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  searchInput: {
    flex:     1,
    fontSize: 14,
    color:    Colors.TEXT_PRIMARY,
  },
  filterRow: {
    flexDirection:     'row',
    gap:               8,
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  filterChipActive: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },
  filterText: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.BG_BASE,
  },
  results: {
    flex: 1,
  },
  noResults: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     60,
    gap:            12,
  },
  noResultsText: {
    fontSize: 14,
    color:    Colors.TEXT_TERTIARY,
  },
  foodItem: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
    gap:               Spacing.S3,
  },
  foodItemLeft: {
    flex: 1,
    gap:  2,
  },
  foodItemNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  foodItemName: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  nepaliTag: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    backgroundColor:   Colors.ACCENT_DIM,
    borderRadius:      4,
  },
  nepaliTagText: {
    fontSize:   9,
    color:      Colors.ACCENT,
    fontWeight: '600',
  },
  foodItemNe: {
    fontSize: 12,
    color:    Colors.ACCENT,
    fontWeight: '500',
  },
  foodItemMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    gap:        2,
  },
  foodItemCals: {
    fontSize:     18,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  foodItemCalLabel: {
    fontSize: 10,
    color:    Colors.TEXT_TERTIARY,
  },
});