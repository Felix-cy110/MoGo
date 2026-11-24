#include "mogo/investment/domain/models.hpp"
#include "mogo/core_shared/error.hpp"
// InfInt uses the GNU names for long-long limits; map them for Apple/Android libc++.
#include <climits>
#ifndef LONG_LONG_MIN
#define LONG_LONG_MIN LLONG_MIN
#define LONG_LONG_MAX LLONG_MAX
#define ULONG_LONG_MAX ULLONG_MAX
#endif
#define INFINT_USE_EXCEPTIONS
#include "infint/InfInt.hpp"
#include <algorithm>
#include <regex>

namespace mogo::investment {
namespace {
InfInt gcd(InfInt a, InfInt b) {
    while (b != 0) { InfInt rest = a % b; a = b; b = rest; }
    return a;
}
// Preserve exact fractions throughout aggregation. Only serialize rounded decimals at the boundary.
class Fraction {
public:
    InfInt numerator = 0, denominator = 1;
    Fraction() = default;
    Fraction(InfInt n, InfInt d) : numerator(std::move(n)), denominator(std::move(d)) {
        const auto divisor = gcd(numerator, denominator);
        numerator /= divisor; denominator /= divisor;
    }
    static Fraction decimal(const std::string& text) {
        auto digits = text;
        const auto dot = digits.find('.');
        std::size_t scale = dot == std::string::npos ? 0 : digits.size() - dot - 1;
        if (dot != std::string::npos) digits.erase(dot, 1);
        return {InfInt(digits), InfInt("1" + std::string(scale, '0'))};
    }
    Fraction operator+(const Fraction& other) const {
        const auto divisor = gcd(denominator, other.denominator);
        const auto left = other.denominator / divisor;
        const auto right = denominator / divisor;
        return {numerator * left + other.numerator * right, denominator * left};
    }
    Fraction operator/(const Fraction& other) const {
        if (other.numerator == 0) throw std::invalid_argument("Zero divisor");
        return {numerator * other.denominator, denominator * other.numerator};
    }
    std::string rounded(std::size_t places) const {
        const InfInt scaled = numerator * InfInt("1" + std::string(places, '0'));
        InfInt integer = scaled / denominator;
        if ((scaled % denominator) * 2 >= denominator) ++integer;
        auto digits = integer.toString();
        if (places == 0) return digits;
        if (digits.size() <= places) digits.insert(0, places + 1 - digits.size(), '0');
        digits.insert(digits.size() - places, 1, '.');
        while (digits.back() == '0') digits.pop_back();
        if (digits.back() == '.') digits.pop_back();
        return digits;
    }
};
}
std::string normalizePositiveDecimal(const std::string& value) {
    static const std::regex format(R"(^[0-9]{1,18}(\.[0-9]{1,18})?$)");
    if (!std::regex_match(value, format) || value.find_first_of("123456789") == std::string::npos)
        throw core_shared::ApplicationError(400, "INVESTMENT_DECIMAL_INVALID", "Expected a positive decimal with up to 18 integer and fractional digits");
    return Fraction::decimal(value).rounded(18);
}
std::string calculateQuantity(const Trade& trade) {
    return (Fraction::decimal(trade.quote_amount) / Fraction::decimal(trade.unit_price)).rounded(36);
}
Summary calculateSummary(const std::vector<Trade>& trades) {
    Summary result;
    Fraction amount, quantity;
    for (const auto& trade : trades) {
        if (trade.deleted_at || trade.side != "BUY") continue;
        const auto cost = Fraction::decimal(trade.quote_amount);
        amount = amount + cost;
        quantity = quantity + cost / Fraction::decimal(trade.unit_price);
        ++result.buy_count;
    }
    result.total_quote_amount = amount.rounded(18);
    result.total_quantity = quantity.rounded(36);
    if (result.buy_count) result.average_entry_price = (amount / quantity).rounded(18);
    return result;
}
}
