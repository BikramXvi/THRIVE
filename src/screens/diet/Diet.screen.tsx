import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { dietService } from '../../services/diet.service';
import type { FoodItemRow, MealLogRow } from '../../services/diet.service';
import { useUIStore } from '../../stores/ui.store';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';


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
  const [userId,       setUserId]       = useState<string | null>(null);
  const [logged,       setLogged]       = useState<MealLogRow[]>([]);
  const [water,        setWater]        = useState(3);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [addingMeal,   setAddingMeal]   = useState<MealType | null>(null);
  const [filterNepali, setFilterNepali] = useState(false);
  const [searchResults, setSearchResults] = useState<FoodItemRow[]>([]);
  const [loadingLogs,   setLoadingLogs]   = useState(true);
  const [searching,     setSearching]     = useState(false);  


  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (addingMeal) {
      searchFoods();
    }
  }, [searchQuery, filterNepali, addingMeal]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    loadTodayLogs(user.id);
  }

  async function loadTodayLogs(uid: string) {
    setLoadingLogs(true);
    const { data } = await dietService.getTodayLogs(uid);
    if (data) setLogged(data);
    setLoadingLogs(false);
  }

  async function searchFoods() {
    setSearching(true);
    const { data } = await dietService.searchFoods(searchQuery, filterNepali);
    if (data) setSearchResults(data);
    setSearching(false);
  }

  async function addFood(food: FoodItemRow) {
    if (!addingMeal || !userId) return;

    const servingSize = food.serving_size ?? 100;
    const servingUnit = food.serving_unit ?? 'g';

    const { error } = await dietService.logFood({
      userId,
      foodItemId:  food.id,
      mealType:    addingMeal,
      servingSize,
      servingUnit,
      food,
    });

    if (error) {
      useUIStore.getState().showToast('Could not log food', 'error');
      return;
    }

    useUIStore.getState().showToast(`${food.name} logged`, 'success');
    setAddingMeal(null);
    setSearchQuery('');
    if (userId) loadTodayLogs(userId);
  }

  async function removeFood(logId: string) {
    const { error } = await dietService.deleteLog(logId);
    if (error) {
      useUIStore.getState().showToast('Could not remove food', 'error');
      return;
    }
    setLogged((prev) => prev.filter((l) => l.id !== logId));
  }

  const totalCals    = logged.reduce((s, l) => s + l.calories, 0);
  const totalProtein = logged.reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const totalCarbs   = logged.reduce((s, l) => s + (l.carbs_g   ?? 0), 0);
  const totalFat     = logged.reduce((s, l) => s + (l.fat_g     ?? 0), 0);
  const remaining    = CALORIE_GOAL - totalCals;
  const calPct       = Math.min(totalCals / CALORIE_GOAL, 1);

  function getMealLogs(meal: MealType) {
    return logged.filter((l) => l.meal_type === meal);
  }

  function getMealCalories(meal: MealType) {
    return getMealLogs(meal).reduce((s, l) => s + l.calories, 0);
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
                          <Text style={styles.foodName}>{log.food_items.name}</Text>
                          {log.food_items.is_nepali && (
                            <View style={styles.nepaliTag}>
                              <Text style={styles.nepaliTagText}>नेपाली</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.foodServing}>
                          {log.serving_size}{log.serving_unit} · {Math.round(log.protein_g ?? 0)}g protein
                        </Text>
                      </View>
                      <Text style={styles.foodCals}>
                        {log.calories}
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
                      {food.is_nepali && (
                        <View style={modalStyles.nepaliTag}>
                          <Text style={modalStyles.nepaliTagText}>नेपाली</Text>
                        </View>
                      )}
                    </View>
                    {food.name_ne && (
                      <Text style={modalStyles.foodItemNe}>{food.name_ne}</Text>
                    )}
                    <Text style={modalStyles.foodItemMeta}>
                      {food.serving_size ?? 100}{food.serving_unit ?? 'g'} · P {food.protein_per_100g ?? 0}g · C {food.carbs_per_100g ?? 0}g · F {food.fat_per_100g ?? 0}g
                    </Text>
                  </View>
                  <View style={modalStyles.foodItemRight}>
                    <Text style={modalStyles.foodItemCals}>{food.calories_per_100g}</Text>
                    <Text style={modalStyles.foodItemCalLabel}>kcal/100g</Text>
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