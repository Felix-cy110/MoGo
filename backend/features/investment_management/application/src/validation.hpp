#pragma once
#include "mogo/investment/domain/models.hpp"
namespace mogo::investment {
std::string nowUtc();
void validateTarget(Target& value);
void validateTrade(Trade& value, bool creating);
}
